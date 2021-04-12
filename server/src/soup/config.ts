import { mediaCodecs } from './mediaCodecs'
import { TransportListenIp, WorkerLogTag } from 'mediasoup/lib/types'

export const config = {
	// http server ip, port, and peer timeout constant
	//
	httpIp: '0.0.0.0',
	httpPort: 3000,
	httpPeerStale: 360000,

	mediasoup: {
		worker: {
			rtcMinPort: 40000,
			rtcMaxPort: 49999,
			logLevel: 'debug',
			logTags: [
				'info',
				'ice',
				'dtls',
				'rtp',
				'srtp',
				'rtcp'
				// 'rtx',
				// 'bwe',
				// 'score',
				// 'simulcast',
				// 'svc'
			] as WorkerLogTag[]
		},
		router: {
			mediaCodecs
		},

		// rtp listenIps are the most important thing, below. you'll need
		// to set these appropriately for your network for the demo to
		// run anywhere but on localhost
		webRtcTransport: {
			listenIps: [
				{
					ip: process.env.WEBRTC_LISTEN_IP || '192.168.1.165',
					announcedIp: process.env.A_IP || undefined
				}
				// { ip: "192.168.42.68", announcedIp: null },
				// { ip: '10.10.23.101', announcedIp: null },
			] as TransportListenIp[],
			initialAvailableOutgoingBitrate: 800000
		}
	}
} as const
