import { Consumer } from 'mediasoup-client/lib/Consumer'
import { MediaKind, RtpParameters } from 'mediasoup-client/lib/RtpParameters'
import { DtlsParameters } from 'mediasoup-client/lib/Transport'

export enum MediaType {
	audio = 'audio',
	video = 'video',
	screen = 'screen'
}

export enum RequestType {
	createTransport = 'createTransport',
	connectTransport = 'connectTransport',
	produceTransport = 'produce',
	connectionChange = 'connectionstatechange',
	connect = 'connect'
}

export type DtlsArgs = {
	dtlsParameters: DtlsParameters
}

export type ProduceTransportArgs = {
	kind: MediaKind
	rtpParameters: RtpParameters
}

export type ConsumeData = {
	id: string
	kind: MediaKind
	rtpParameters: RtpParameters
}

export type GetConsumeData = {
	consumer: Consumer
	stream: MediaStream
	kind: MediaKind
}

export type ProducerList = { producerId: string }[]
