import { Consumer, Producer, Transport } from 'mediasoup/lib/types'

type Peer = {
	sendTransport: Transport | null
	recvTransport: Transport | null
	producer: Producer | null
	consumers: Consumer[]
}

export default Peer
