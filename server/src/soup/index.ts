import { Router } from 'mediasoup/lib/Router'
import { Worker } from 'mediasoup/lib/Worker'
import createSoup from './createSoup'
import { Rooms } from './utils/Room'

const rooms: Rooms = {}

const main = async () => {
	let workers: WorkerAndRouterMap[]

	try {
		workers = await createSoup()

		console.log('Workers', workers)
	} catch (err) {
		console.error(err)
	}
}

export default main
