# Fahrzeug-Reise & Tag/Nacht-Uhr

Portiert aus Phase 11. GM-only Verwaltung (Routen-Icon in der Token-Werkzeugleiste), Tag/Nacht-Anzeige oben rechts fuer alle Spieler.

## Nutzung

1. GM oeffnet "Reise", legt Startstunde fest, optional eine bestehende Szene als Fahrzeug-Innenraum, fuegt beliebig viele Wegpunkte (Name, Reisezeit in Stunden, Rast-Haken) hinzu und klickt "Route starten".
2. "Naechster Wegpunkt" schaltet die Route weiter, postet eine Chat-Systemnachricht und aktualisiert die Uhr bei allen Clients live (per Socket-Broadcast).
3. "Fahrzeug-Szene aktivieren" aktiviert die verknuepfte Szene fuer alle.
