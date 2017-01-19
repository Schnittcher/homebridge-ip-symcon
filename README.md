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
    "pollingTime": 60
  }
]
```

Bei SymconHost muss die URL zu dem IPS Webinterface inkl. Port eingetragen werden.
Bei SymconService wird hinterlegt, um welchen Service es sich handelt.
Bei pollingTime wird die Zeit in Sekunden angegeben, in der das Gerät abgefragt werden soll, entfernt man den Parameter aus der config.json wird alle 5 Sekunden gepollt.
Möglichkeiten für den SymconService wären zur Zeit: Temperatur und Switch, weitere folgen.

In IP-Symcon muss ein Hook (https://www.symcon.de/service/dokumentation/modulreferenz/webhook-control/) angelegt werden.

Beispiel zum Abfragen von Werten:

```
if($_GET["action"] == "get")  {
  if($_GET["device"] == "TVBuero") {
    echo GetValue(39504);
  }
  if($_GET["device"] == "Flur Temperatur") {
    echo GetValue(47209);
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
```
