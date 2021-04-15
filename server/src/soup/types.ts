import { Consumer, ConsumerType } from 'mediasoup/lib/Consumer'
import { MediaKind, RtpParameters } from 'mediasoup/lib/RtpParameters'
import {
	DtlsParameters,
	IceCandidate,
	IceParameters
} from 'mediasoup/lib/WebRtcTransport'

export type ProducerList = { producerId: string }[]

export type WebRtcTranportParams = {
	params: {
		id: string
		iceParameters: IceParameters
		iceCandidates: IceCandidate[]
		dtlsParameters: DtlsParameters
	}
}

export type JSONResponse = { id: string; peers: string }

export type Params = {
	producerId: string
	id: string
	kind: MediaKind
	rtpParameters: RtpParameters
	type: ConsumerType
	producerPaused: boolean
}

export type CreateConsumer = {
	consumer: Consumer
	params: Params
}
