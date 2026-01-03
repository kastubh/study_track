import os
from twilio.rest import Client
import logging

class NotificationService:
    @staticmethod
    def send_whatsapp(to_number, message_body):
        sid = os.environ.get('TWILIO_SID')
        auth_token = os.environ.get('TWILIO_AUTH')
        from_number = os.environ.get('TWILIO_WHATSAPP_FROM')
        
        if not sid or not auth_token or not from_number:
            logging.warning("Twilio credentials not set. Message logged: %s", message_body)
            return {"status": "mock", "message": message_body}
            
        try:
            client = Client(sid, auth_token)
            message = client.messages.create(
                from_=from_number,
                body=message_body,
                to=f"whatsapp:{to_number}"
            )
            return {"status": "sent", "sid": message.sid}
        except Exception as e:
            logging.error("Failed to send WhatsApp: %s", str(e))
            return {"status": "error", "error": str(e)}
