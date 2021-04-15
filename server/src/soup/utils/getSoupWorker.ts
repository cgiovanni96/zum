import { Worker } from 'mediasoup/lib/Worker'

const getWorker = (workers: Worker[], nextWorkerIdx: number): Worker => {
	const worker = workers[nextWorkerIdx]

	if (++nextWorkerIdx == workers.length) nextWorkerIdx = 0

	return worker
}

export default getWorker
