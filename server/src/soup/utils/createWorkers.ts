import * as mediasoup from 'mediasoup'
import { Worker } from 'mediasoup/lib/types'
import config from '../config'

const createWorkers = async (): Promise<Worker[]> => {
	let workers: Worker[] = []

	const { numWorkers } = config.mediasoup

	for (let i = 0; i < numWorkers; i++) {
		const worker: Worker = await mediasoup.createWorker({
			logLevel: config.mediasoup.worker.logLevel,
			logTags: config.mediasoup.worker.logTags,
			rtcMinPort: config.mediasoup.worker.rtcMinPort,
			rtcMaxPort: config.mediasoup.worker.rtcMaxPort
		})

		worker.on('died', () => {
			console.error('mediasoup worker died (this should never happen)')
			process.exit(1)
		})

		workers.push(worker)
	}

	return workers
}

export default createWorkers
