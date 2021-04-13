import * as mediasoup from 'mediasoup'
import { Router, Worker } from 'mediasoup/lib/types'
import config from './config'

export type Soup = {
	worker: Worker
	router: Router
}

const createSoup = async (): Promise<Soup> => {
	let worker = await mediasoup.createWorker({
		logLevel: config.mediasoup.worker.logLevel,
		logTags: config.mediasoup.worker.logTags,
		rtcMinPort: config.mediasoup.worker.rtcMinPort,
		rtcMaxPort: config.mediasoup.worker.rtcMaxPort
	})

	worker.on('died', () => {
		console.error('mediasoup worker died (this should never happen)')
		process.exit(1)
	})

	const mediaCodecs = config.mediasoup.router.mediaCodecs
	const router = await worker.createRouter({ mediaCodecs })

	return {
		worker,
		router
	}
}

export default createSoup
