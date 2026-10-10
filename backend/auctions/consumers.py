from channels.generic.websocket import AsyncJsonWebsocketConsumer


class AuctionConsumer(AsyncJsonWebsocketConsumer):
    async def connect(self):
        auction_id = self.scope['url_route']['kwargs'].get('auction_id')
        self.group_name = f'auction_{auction_id}' if auction_id is not None else 'auction_global'

        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(self.group_name, self.channel_name)

    async def auction_message(self, event):
        await self.send_json(event['message'])
