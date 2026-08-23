/* ============================================================
   DOMAIN — firmware de referinta pentru ESP32
   ------------------------------------------------------------
   Rolul lui: sa scoata pe Serial, la 115200 baud, cate o linie
   JSON per masuratoare, in formatul pe care il asteapta site-ul:

       {"bpm":78.2,"ibi":767}

   bpm — batai pe minut (float)
   ibi — inter-beat interval in milisecunde (optional, dar
         TRIMITE-L daca poti: din el se calculeaza HRV/RMSSD,
         care e un indicator de stres mai rapid decat BPM-ul.)

   Trimite ~10 linii pe secunda. Nu trimite mai des de 20 Hz —
   nu castigi nimic si incarci degeaba serialul.

   Senzorul: exemplul de mai jos e pentru un senzor analogic
   simplu (tip pulse sensor pe A0 / GPIO34). Daca folositi
   MAX30102, inlocuiti blocul de detectie a batailor cu
   biblioteca SparkFun MAX3010x si pastrati partea de output.
   ============================================================ */

#define PULSE_PIN 34          // ADC1_CH6 pe majoritatea placilor ESP32
#define SAMPLE_HZ 200         // rata de esantionare a semnalului brut
#define OUTPUT_HZ 10          // rata la care raportam catre PC

unsigned long lastSample = 0;
unsigned long lastOutput = 0;
unsigned long lastBeat   = 0;

int   threshold   = 2048;     // prag adaptiv
int   sigMin      = 4095;
int   sigMax      = 0;
bool  above       = false;

float bpm         = 0;
float ibiMs       = 0;

// mediere pe ultimele 5 intervale — scoate zgomotul fara sa
// intarzie prea mult raspunsul la o crestere brusca de puls
const int NIBI = 5;
float ibiBuf[NIBI];
int   ibiIdx = 0;
int   ibiCount = 0;

void setup() {
  Serial.begin(115200);
  analogReadResolution(12);
  delay(300);
}

void loop() {
  unsigned long now = millis();

  /* ---------- 1. esantionare + detectia batailor ---------- */
  if (now - lastSample >= (1000 / SAMPLE_HZ)) {
    lastSample = now;
    int v = analogRead(PULSE_PIN);

    if (v < sigMin) sigMin = v;
    if (v > sigMax) sigMax = v;

    // prag la 65% din amplitudinea recenta
    threshold = sigMin + (sigMax - sigMin) * 0.65;

    // front crescator peste prag = o bataie, cu refractar de 300ms
    if (!above && v > threshold && (now - lastBeat) > 300) {
      above = true;
      float thisIbi = now - lastBeat;
      lastBeat = now;

      if (thisIbi > 300 && thisIbi < 2000) {   // 30..200 BPM
        ibiBuf[ibiIdx] = thisIbi;
        ibiIdx = (ibiIdx + 1) % NIBI;
        if (ibiCount < NIBI) ibiCount++;

        float sum = 0;
        for (int i = 0; i < ibiCount; i++) sum += ibiBuf[i];
        float avg = sum / ibiCount;

        ibiMs = thisIbi;      // intervalul BRUT — necesar pentru HRV
        bpm   = 60000.0 / avg;
      }
    }
    if (above && v < threshold) above = false;

    // decadere lenta a min/max, ca pragul sa se readapteze
    if (now % 1000 < (1000 / SAMPLE_HZ)) {
      sigMin += 4;
      sigMax -= 4;
      if (sigMax < sigMin + 100) { sigMin = 0; sigMax = 4095; }
    }
  }

  /* ---------- 2. raportare catre PC ---------- */
  if (now - lastOutput >= (1000 / OUTPUT_HZ)) {
    lastOutput = now;
    if (bpm > 25 && bpm < 220) {
      Serial.print("{\"bpm\":");
      Serial.print(bpm, 1);
      Serial.print(",\"ibi\":");
      Serial.print(ibiMs, 0);
      Serial.println("}");
    }
  }
}
