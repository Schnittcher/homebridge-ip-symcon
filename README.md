# homebridge-ip-symcon
Bei homebridge-ip-symcon handelt es sich um ein Plugin für die Homebridge von nfarina (https://github.com/nfarina/homebridge) um IP-Symcon (www.symcon.de) mit Siri zu verbinden.

# Konfiguration

config.json Beispiel:

```
"accessories": [
  {
    "accessory": "IP-Symcon",
    "name": "Flur Temperatur",
    "SymconHost": "http://IP:Port",
    "SymconService": "Temperatur",
    "pollingTime": 60,
    "debug": true
  }
]
```

Bei SymconHost muss die URL zu dem IPS Webinterface inkl. Port eingetragen werden.
Bei SymconService wird hinterlegt, um welchen Service es sich handelt.
Bei pollingTime wird die Zeit in Sekunden angegeben, in der das Gerät abgefragt werden soll, entfernt man den Parameter aus der config.json wird alle 5 Sekunden gepollt.
Debug kann gesetzt werden, dann gibt es mehr Einträge im Log, wenn der Wert nicht gesetzt wird, steht er automatisch auf false.

* Möglichkeiten für den SymconService wären zur Zeit:
           * Temperatur
           * Switch
           * Luftfeuchtigkeitssensor
           * Luftfeuchtigkeitssensor
           * Lightbulb mit Dimmer

In IP-Symcon muss ein Hook (https://www.symcon.de/service/dokumentation/modulreferenz/webhook-control/) angelegt werden.
Der Hook muss "siri" heißen.

Beispiel zum Abfragen von Werten:

```
if($_GET["action"] == "get")  {
  if($_GET["device"] == "TVBuero") {
    echo GetValue(39504);
  }
  if($_GET["device"] == "Flur Temperatur") {
    echo GetValue(47209);
  }
  if($_GET["device"] == "Flur Deckenlampe") {
  		echo GetValue(16865);
  		if($_GET["brightness"] == "1")   { //die 1 hier wird nur als true angesehen, nicht verändern
  			echo GetValue(21441);
  		}
  	}
  }

if($_GET["action"] == "setOn")  {
  //Stecker Büro
  if($_GET["device"] == "TVBuero")  {
   ZW_SwitchMode(50077, true); //<-- Beispiel zum schalten für einen Z-Wave Switch.
echo GetValue(39504);   
	}
}

if($_GET["action"] == "setOff")  {
  //Stecker Büro
  if($_GET["device"] == "TVBuero")   {
   ZW_SwitchMode(50077, false); //<-- Beispiel zum schalten für einen Z-Wave Switch.
		echo GetValue(39504);
		}
}

if($_GET["action"] == "setBrightness")  { // nicht verändern
  if($_GET["device"] == "Flur Deckenlampe")  {  // Hier den Namen austauschen
           LCN_SetIntensity(23451, $_GET["Intensity"],0); // Funktion zum setzen der Dimmer Variable

  }
}  
```
 $_GET["Intensity"] wird über das Homebridge Plugin gesetzt und enthält den Wert, der gesetzt werden soll.
