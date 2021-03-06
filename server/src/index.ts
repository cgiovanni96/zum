require('dotenv').config()
import http from 'http'
import express from 'express'
import { Server, Socket } from 'socket.io'

import createWorkers from './soup/utils/createWorkers'
import soupConfig from './soup/config'
import Room from './Room'
import getWorker from './soup/utils/getSoupWorker'
import Peer from './Peer'

export interface ExtendedSocket extends Socket {
	roomId?: string
}

const roomList = new Map<string, Room>()

const main = async () => {
	// const { sslKey, sslCrt } = soupConfig
	// if (!fs.existsSync(sslKey) || !fs.existsSync(sslCrt)) {
	// 	console.error('SSL files are not found. check your config.js file')
	// 	process.exit(0)
	// }
	// const tls = {
	// 	cert: fs.readFileSync(sslCrt),
	// 	key: fs.readFileSync(sslKey)
	// }
	const soupWorkers = await createWorkers()
	let nextWorkerIdx = 0

	const app = express()
	app.use(express.json())
	app.use(express.static(__dirname))

	const webServer = http.createServer(app)

	const { httpIp, httpPort } = soupConfig
	webServer.listen(httpPort, httpIp, () => {
		const listenIps = soupConfig.mediasoup.webRtcTransport.listenIps[0]
		const ip = listenIps.announcedIp || listenIps.ip
		console.log('server is running')
		console.log(`open https://${ip}:${httpPort} in your web browser`)
	})

	const io = new Server(webServer, {
		serveClient: false,
		path: '/server'
	})

	io.on('connection', (socket: ExtendedSocket) => {
		console.log('--- connection')

		socket.on('createRoom', async ({ roomId }, cb) => {
			console.log('--- createRoom')
			if (!roomList.has(roomId)) {
				console.log(`---created room--- ${roomId}`)
				const worker = getWorker(soupWorkers, nextWorkerIdx)
				roomList.set(roomId, new Room(roomId, worker, io))
				cb(roomId)
			} else cb('already exists')
		})

		socket.on('join', ({ roomId, name }, cb) => {
			console.log('--- join')
			if (!roomList.has(roomId)) return cb({ error: 'room not found' })

			roomList.get(roomId)?.addPeer(new Peer(socket.id, name))
			socket.roomId = roomId

			cb(roomList.get(roomId)?.toJson)
		})

		socket.on('getProducers', () => {
			console.log('--- getProducers')
			if (!socket.roomId) return
			if (!roomList.has(socket.roomId)) return
			const producerList = roomList.get(socket.roomId)?.getProducerListForPeer()

			socket.emit('newProducers', producerList)
		})

		socket.on('getRouterCapabilities', (_, cb) => {
			console.log('--- getRouterCapabilities')
			if (!socket.roomId) return
			try {
				cb(roomList.get(socket.roomId)?.getRtpCapabilities())
			} catch (error) {
				cb({ error: error.message })
			}
		})

		socket.on('createTransport', async (_, cb) => {
			console.log('--- createTransport')
			if (!socket.roomId) return
			try {
				const webRtcParams = await roomList
					.get(socket.roomId)
					?.createWebRtcTranport(socket.id)

				cb(webRtcParams?.params)
			} catch (error) {
				cb({ error: error.message })
			}
		})

		socket.on(
			'connectTransport',
			async ({ transportId, dtlsParameters }, cb) => {
				console.log('--- connectTransport')
				if (!socket.roomId || !roomList.has(socket.roomId)) return
				await roomList
					.get(socket.roomId)
					?.connectPeerTransport(socket.id, transportId, dtlsParameters)

				cb('success')
			}
		)

		socket.on('produce', async ({ kind, rtpParameters, transportId }, cb) => {
			console.log('--- producer')
			if (!socket.roomId || !roomList.has(socket.roomId))
				return cb({ error: 'not room' })

			const room = roomList.get(socket.roomId)

			const producerId = await room?.produce(
				socket.id,
				transportId,
				rtpParameters,
				kind
			)

			console.log('--- producerId', producerId)

			cb(producerId)
		})

		socket.on(
			'consume',
			async ({ transportId, producerId, rtpCapabilities, kind }, cb) => {
				console.log('--- consume')
				if (!socket.roomId || !roomList.has(socket.roomId))
					return cb({ error: 'no room' })
				const params = await roomList
					.get(socket.roomId)
					?.consume(socket.id, transportId, producerId, rtpCapabilities, kind)
				if (!params) return cb({ error: 'something went wrong' })
				cb(params)
			}
		)

		socket.on('resume', async ({ peerId, transportId }, cb) => {
			console.log('--- resume')
			if (!socket.roomId || !roomList.has(socket.roomId))
				return cb({ error: 'no room' })

			await roomList
				.get(socket.roomId)
				?.peers.get(peerId)
				?.consumers.get(transportId)
				?.resume()

			cb('resumed')
		})

		socket.on('getRoomInfo', (_, cb) => {
			console.log('--- getRoomInfo')
			if (!socket.roomId || !roomList.has(socket.roomId))
				return cb({ error: 'no room' })
			cb(roomList.get(socket.roomId)?.toJson())
		})

		socket.on('disconnect', () => {
			console.log('--- disconnect')
			if (!socket.roomId || !roomList.has(socket.roomId)) return
			roomList.get(socket.roomId)?.removePeer(socket.id)
		})

		socket.on('producerClosed', ({ producerId }, cb) => {
			console.log('--- producerClosed')
			if (!socket.roomId || !roomList.has(socket.roomId))
				return cb({ error: 'no room' })
			roomList.get(socket.roomId)?.closeProducer(socket.id, producerId)
		})

		socket.on('exitRoom', async (_, cb) => {
			console.log('--- exitRoom')
			if (!socket.roomId || !roomList.has(socket.roomId))
				return cb({ error: 'no room' })

			await roomList.get(socket.roomId)?.removePeer(socket.id)

			if (roomList.get(socket.roomId)?.getPeers().size === 0)
				roomList.delete(socket.roomId)

			cb('success')
		})
	})
}

export const room = () => {
	console.log('--- room')
	return Object.values(roomList).map((room: Room) => {
		return {
			id: room.id,
			router: room.router.id,
			peers: Object.values(room.peers).map((peer: Peer) => {
				return {
					name: peer.name
				}
			})
		}
	})
}

main()
