import json
from channels.generic.websocket import AsyncWebsocketConsumer

class AuctionConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.auction_id = self.scope['url_route']['kwargs'].get('auction_id')
        
        if self.auction_id:
            self.room_group_name = f'auction_{self.auction_id}'
        else:
            self.room_group_name = 'auction_global'

        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )

        await self.accept()

    async def disconnect(self, close_code):
        if hasattr(self, 'room_group_name'):
            await self.channel_layer.group_discard(
                self.room_group_name,
                self.channel_name
            )

    async def auction_message(self, event):
        message = event['message']
        await self.send(text_data=json.dumps(message))
