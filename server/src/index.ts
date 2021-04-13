import mediasoup from 'mediasoup'
import http from 'http'
import express from 'express'
import { Server } from 'socket.io'

import createSoup from './soup/createSoup'
import soupConfig from './soup/config'
import { createTransport } from './soup/utils/createTransport'
import { createConsumer } from './soup/utils/createConsumer'

type ServerData = {
	producer?: mediasoup.types.Producer
	consumer?: mediasoup.types.Consumer
	producerTransport?: mediasoup.types.WebRtcTransport
	consumerTransport?: mediasoup.types.WebRtcTransport
}

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

	const app = express()
	app.use(express.json())
	app.use(express.static(__dirname))

	const webServer = http.createServer(app)
	webServer.on('error', (err) => {
		console.error('starting web server failed:', err.message)
	})

	await new Promise((resolve) => {
		const { httpIp, httpPort } = soupConfig
		webServer.listen(httpPort, httpIp, () => {
			const listenIps = soupConfig.mediasoup.webRtcTransport.listenIps[0]
			const ip = listenIps.announcedIp || listenIps.ip
			console.log('server is running')
			console.log(`open https://${ip}:${httpPort} in your web browser`)
			resolve(true)
		})
	})

	const socketServer = new Server(webServer, {
		serveClient: false,
		path: '/server'
	})

	const soupWorker = await createSoup()

	const serverData: ServerData = {}

	socketServer.on('connection', (socket) => {
		console.log('client connected')

		// inform the client about existence of producer
		// if (producer) {
		// 	socket.emit('newProducer')
		// }

		socket.on('disconnect', () => {
			console.log('client disconnected')
		})

		socket.on('connect_error', (err) => {
			console.error('client connection error', err)
		})

		socket.on('getRouterRtpCapabilities', (_, callback) => {
			callback(soupWorker.router.rtpCapabilities)
		})

		socket.on('createProducerTransport', async (_, callback) => {
			try {
				const transport = await createTransport(soupWorker.router)
				serverData.producerTransport = transport
				callback(transport.appData)
			} catch (err) {
				console.error(err)
				callback({ error: err.message })
			}
		})

		socket.on('createConsumerTransport', async (_, callback) => {
			try {
				const transport = await createTransport(soupWorker.router)
				serverData.consumerTransport = transport
				callback(transport.appData)
			} catch (err) {
				console.error(err)
				callback({ error: err.message })
			}
		})

		socket.on('connectProducerTransport', async (data, callback) => {
			if (serverData.producerTransport)
				await serverData.producerTransport.connect({
					dtlsParameters: data.dtlsParameters
				})
			callback()
		})

		socket.on('connectConsumerTransport', async (data, callback) => {
			if (serverData.consumerTransport)
				await serverData.consumerTransport.connect({
					dtlsParameters: data.dtlsParameters
				})
			callback()
		})

		socket.on('produce', async (data, callback) => {
			const { kind, rtpParameters } = data
			if (!serverData.producerTransport) return
			serverData.producer = await serverData.producerTransport.produce({
				kind,
				rtpParameters
			})
			callback({ id: serverData.producer.id })

			// inform clients about new producer
			socket.broadcast.emit('newProducer')
		})

		socket.on('consume', async (_, callback) => {
			if (
				!serverData.producer ||
				!serverData.producerTransport ||
				!serverData.consumerTransport
			)
				return

			serverData.consumer = await serverData.consumerTransport.consume({
				producerId: serverData.producer.id,
				rtpCapabilities: soupWorker.router.rtpCapabilities,
				paused: serverData.producer.kind === 'video'
			})

			callback(
				await createConsumer(
					soupWorker.router,
					serverData.producer,
					soupWorker.router.rtpCapabilities,
					serverData.producerTransport
				)
			)
		})

		socket.on('resume', async (_, callback) => {
			if (!serverData.consumer) return
			await serverData.consumer.resume()
			callback()
		})
	})
}

main()
