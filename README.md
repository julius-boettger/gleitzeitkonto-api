# Gleitzeitkonto-API - Automatische Berechnung deiner Überstunden mit [Node.js](https://nodejs.org/)

Entwickelt zur Verwendung in einem spezifischen Unternehmen, dessen Name aus Datenschutzgründen nicht erwähnt wird.

# Installation

- Browser aussuchen / installieren: [Microsoft Edge](https://www.microsoft.com/de-de/edge) oder [Google Chrome](https://www.google.com/intl/de_de/chrome/) (vermutlich funktioniert jeder [Chromium](https://www.chromium.org/Home/)-basierte Browser)
- Alle Node-Packages unter `"dependencies": {...}` in [package.json](https://github.com/julius-boettger/gleitzeitkonto-api/blob/master/package.json) installieren
- [gleitzeitkonto-api.js](https://github.com/julius-boettger/gleitzeitkonto-api/blob/master/gleitzeitkonto-api.js) (JavaScript-Version) oder [gleitzeitkonto-api.ts](https://github.com/julius-boettger/gleitzeitkonto-api/blob/master/gleitzeitkonto-api.ts) (TypeScript-Version) herunterladen und in dein Projekt einbinden
- [Hinweise zur Benutzung](#benutzung) lesen :)

# Benutzung

## Quellcode

[test.js](https://github.com/julius-boettger/gleitzeitkonto-api/blob/master/test.js) zeigt ein Minimalbeispiel zur Benutzung der API. 

Ein Objekt der Klasse `GleitzeitkontoAPI` verfügt über zwei Klassenmethoden: `downloadWorkingTimes` und `calculateFromWorkingTimes`. Beide Methoden sowie der Konstruktor sind mit ausführlichen Dokumentationskommentaren im Quellcode versehen.

---

### **`constructor`**

Versucht Config aus lokaler Datei zu lesen. Wenn die angegebene Datei nicht existiert oder nicht als korrekte Config-Datei erkannt wird, werden Standard-Werte verwendet und in eine neue Datei unter dem angegebenen Pfad gespeichert ([zur Config-Datei später mehr](#config-datei)).

Der Parameter `url` ist dabei der Link zur "Meine Zeitenübersicht"-Seite im internen Fiori als String, also in der Form `"https://..."`. Besagter Link sollte vor Verwendung der API einmal manuell im ausgesuchten Browser geöffnet werden um sich ggf. anzumelden (und angemeldet zu bleiben!)

---

### **`downloadWorkingTimes`**

Öffnet mit [Puppeteer](https://pptr.dev/) ein neues Browser-Fenster, navigiert zur Zeitenübersicht, lädt eingetragene Arbeitszeiten als CSV-Datei herunter und gibt einen Status-Code zurück (Erklärung der Codes im Dokumentationskommentar)

---

### **`calculateFromWorkingTimes`**

Liest eine lokale CSV-Datei mit Arbeitszeiten aus und berechnet aus ihr den aktuellen Stand des Gleiteitkontos (auch "Überstunden" oder "aktuelles Gleitzeit-Saldo" genannt)

---

## Config-Datei

Personenspezifische Daten und Daten, die über mehrere Programmaufrufe gespeichert werden sollen, werden in einer Config-Datei (JSON) gespeichert.

---

### **`wochenstunden`** (Standard-Wert: `40`)
Arbeitsstunden in einer Woche

---

### **`startStunden`** (Standard-Wert: `0.0`)
Stand des Gleitzeitkontos zum `startDatum` in Stunden. Wenn `startDatum` vor der ersten eingetragenen Arbeitszeit liegt (z.B. bei Verwendung des Standard-Werts) sollte `startStunden = 0.0 = 0` sein.

---

### **`startDatum`** & **`endDatum`** (Standard-Werte: `"01.01.1999"` & `"31.12.2099"`)
Daten, zwischen denen registrierte Arbeitszeiten für die Berechnung des Gleitzeitkontos betrachtet werden sollen (angegebene Daten im Format `"DD.MM.YYYY"` inklusive)

`endDatum` kann ein statisches Datum (wie der Standard-Wert) oder ein dynamisches Datum ausgehend vom Tag des Programmaufrufes sein (erlaubt sind `"gestern"`, `"heute"` oder `"morgen"`)

---

### **`browserPfad`** (Standard-Wert: `"C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe"`)
Pfad zur ausführbaren Datei [einer der oben genannten Browser](#installation)

---

### **Nützlicher Hinweis**
Um den Programmablauf zu vereinfachen/verkürzen können Werte für `startStunden` und `startDatum` aus einem beliebigen **vollständigen** (für einen ganzen Monat) Zeitnachweis entnommen werden:

Fiori => Meine Bescheinigungen => Zeitnachweis

In einem Zeitnachweis findet sich dann eine Tabelle unter "Monatsübersicht zum Stichtag DD.MM.YYYY", wobei der Stichtag aus der Überschrift als Wert für `startDatum` und "GLZ-Saldo aktuell" als Wert für `startStunden` verwendet werden kann.
