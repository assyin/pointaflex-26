#!/usr/bin/env python3
"""
Script de synchronisation des pointages ZKTeco
Récupère les pointages des terminaux CP et CIT depuis une date donnée
"""

import requests
import sys
from datetime import datetime, timedelta
from zk import ZK

# =============================================================================
# CONFIGURATION
# =============================================================================
TERMINALS = [
    {
        "name": "Pointeuse CP",
        "ip": "192.168.16.174",
        "port": 4370,
        "device_id": "EJB8241100241"
    },
    {
        "name": "Pointeuse CIT",
        "ip": "192.168.16.175",
        "port": 4370,
        "device_id": "EJB8241100244"
    }
]

BACKEND_URL = "http://localhost:3000/api/v1/attendance/webhook/state"
TENANT_ID = "340a6c2a-160e-4f4b-917e-6eea8fd5ff2d"
TIMEOUT = 15

# Mapping des types de vérification
VERIFY_MODE_MAP = {
    0: "PIN_CODE",
    1: "FINGERPRINT",
    3: "FINGERPRINT",
    4: "FACE_RECOGNITION",
    15: "RFID_BADGE",
}

# Mapping state ZKTeco → type
# state 0 = IN (Check-In)
# state 1 = OUT (Check-Out)
STATE_TYPE_MAP = {
    0: "IN",
    1: "OUT",
    2: "OUT",  # Break-Out
    3: "IN",   # Break-In
    4: "IN",   # OT-In
    5: "OUT",  # OT-Out
}

# =============================================================================
# FONCTIONS
# =============================================================================
def get_last_monday():
    """Retourne la date du lundi de la semaine dernière"""
    today = datetime.now()
    days_since_monday = today.weekday()
    if days_since_monday == 0:  # Si aujourd'hui est lundi
        days_since_monday = 7
    return today - timedelta(days=days_since_monday)

def send_to_backend(attendance, device_id):
    """Envoie un pointage au backend"""
    employee_id = str(attendance.user_id).zfill(5)  # Pad avec des zéros

    # Déterminer le type (IN/OUT) basé sur le state
    state = getattr(attendance, 'status', 0)
    punch_type = STATE_TYPE_MAP.get(state, "IN")

    payload = {
        "employeeId": employee_id,
        "timestamp": attendance.timestamp.strftime("%Y-%m-%dT%H:%M:%S.000Z"),
        "type": punch_type,
        "terminalState": state,
        "method": VERIFY_MODE_MAP.get(getattr(attendance, 'punch', 1), "FINGERPRINT"),
    }

    headers = {
        "Content-Type": "application/json",
        "X-Device-ID": device_id,
        "X-Tenant-ID": TENANT_ID,
    }

    try:
        response = requests.post(BACKEND_URL, json=payload, headers=headers, timeout=TIMEOUT)
        result = response.json()

        if response.status_code == 201 or result.get('status') in ['CREATED', 'DUPLICATE', 'DEBOUNCE_BLOCKED']:
            return True, result.get('status', 'OK'), result.get('anomaly')
        else:
            return False, result.get('error', 'Unknown error'), None
    except Exception as e:
        return False, str(e), None

def sync_terminal(terminal_config, start_date, end_date):
    """Synchronise les pointages d'un terminal"""
    name = terminal_config['name']
    ip = terminal_config['ip']
    port = terminal_config['port']
    device_id = terminal_config['device_id']

    print(f"\n{'='*60}")
    print(f"📡 Connexion à {name} ({ip}:{port})")
    print(f"{'='*60}")

    zk = ZK(ip, port=port, timeout=TIMEOUT)
    conn = None

    stats = {
        'total': 0,
        'sent': 0,
        'duplicates': 0,
        'errors': 0,
        'anomalies': {}
    }

    try:
        conn = zk.connect()
        print(f"✅ Connecté: {conn.get_device_name()}")
        print(f"📊 Firmware: {conn.get_firmware_version()}")

        users = conn.get_users()
        print(f"👥 Utilisateurs: {len(users)}")

        attendances = conn.get_attendance()
        print(f"📊 Total pointages dans terminal: {len(attendances)}")

        # Filtrer par date
        filtered = [a for a in attendances if start_date <= a.timestamp <= end_date]
        print(f"📅 Pointages du {start_date.strftime('%d/%m/%Y')} au {end_date.strftime('%d/%m/%Y')}: {len(filtered)}")

        stats['total'] = len(filtered)

        if not filtered:
            print("⚠️  Aucun pointage à synchroniser")
            return stats

        # Trier par timestamp
        filtered.sort(key=lambda x: x.timestamp)

        print(f"\n🔄 Envoi des pointages...")

        for i, attendance in enumerate(filtered, 1):
            employee_id = str(attendance.user_id).zfill(5)
            state = getattr(attendance, 'status', 0)
            punch_type = STATE_TYPE_MAP.get(state, "IN")

            success, status, anomaly = send_to_backend(attendance, device_id)

            if success:
                if status == 'DUPLICATE' or status == 'DEBOUNCE_BLOCKED':
                    stats['duplicates'] += 1
                    symbol = "⊘"
                else:
                    stats['sent'] += 1
                    symbol = "✅"

                if anomaly:
                    stats['anomalies'][anomaly] = stats['anomalies'].get(anomaly, 0) + 1

                print(f"  {symbol} [{i}/{len(filtered)}] {employee_id} | {attendance.timestamp.strftime('%d/%m %H:%M')} | {punch_type} | {status}" + (f" | ⚠️ {anomaly}" if anomaly else ""))
            else:
                stats['errors'] += 1
                print(f"  ❌ [{i}/{len(filtered)}] {employee_id} | {attendance.timestamp.strftime('%d/%m %H:%M')} | Erreur: {status}")

        return stats

    except Exception as e:
        print(f"❌ Erreur: {e}")
        return stats
    finally:
        if conn:
            conn.disconnect()
            print(f"👋 Déconnecté de {name}")

def main():
    """Fonction principale"""
    print("\n" + "="*60)
    print("🔄 SYNCHRONISATION DES TERMINAUX ZKTECO")
    print("="*60)

    # Calculer les dates
    start_date = get_last_monday().replace(hour=0, minute=0, second=0, microsecond=0)
    end_date = datetime.now()

    print(f"\n📅 Période: {start_date.strftime('%d/%m/%Y %H:%M')} → {end_date.strftime('%d/%m/%Y %H:%M')}")
    print(f"🌐 Backend: {BACKEND_URL}")
    print(f"🏢 Tenant: {TENANT_ID}")

    total_stats = {
        'total': 0,
        'sent': 0,
        'duplicates': 0,
        'errors': 0,
        'anomalies': {}
    }

    for terminal in TERMINALS:
        stats = sync_terminal(terminal, start_date, end_date)
        total_stats['total'] += stats['total']
        total_stats['sent'] += stats['sent']
        total_stats['duplicates'] += stats['duplicates']
        total_stats['errors'] += stats['errors']
        for anomaly, count in stats['anomalies'].items():
            total_stats['anomalies'][anomaly] = total_stats['anomalies'].get(anomaly, 0) + count

    # Résumé final
    print("\n" + "="*60)
    print("📊 RÉSUMÉ FINAL")
    print("="*60)
    print(f"   Total pointages traités: {total_stats['total']}")
    print(f"   ✅ Envoyés avec succès:  {total_stats['sent']}")
    print(f"   ⊘ Doublons ignorés:      {total_stats['duplicates']}")
    print(f"   ❌ Erreurs:              {total_stats['errors']}")

    if total_stats['anomalies']:
        print(f"\n   ⚠️ Anomalies détectées:")
        for anomaly, count in sorted(total_stats['anomalies'].items()):
            print(f"      - {anomaly}: {count}")

    print("="*60 + "\n")

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n🛑 Synchronisation interrompue")
        sys.exit(1)
    except Exception as e:
        print(f"\n💥 Erreur critique: {e}")
        sys.exit(1)
