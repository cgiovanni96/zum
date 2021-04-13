import Fastify, { FastifyInstance } from 'fastify'
import middie from 'middie'
import * as http from 'httpj'
import { config } from './soup/config'
import socketIO from 'socket.io'

// import soup from './soup'
// import mercurius from 'mercurius'

const createFastifyApp = async (): Promise<FastifyInstance> => {
	const app = Fastify()
	app.register(middie)

	app.setErrorHandler((error, _, res) => {
		if (error) {
			console.error('Fastify error,', error.message)

			error.statusCode =
				error.statusCode || (error.name === 'TypeError' ? 400 : 500)

			res.status(error.statusCode).send(String(error))
		}
	})

	return app
}

const createHttpServer = async (): Promise<FastifyInstance> => {
	// const { sslKey, sslCrt } = config
	// if (!fs.existsSync(sslKey) || !fs.existsSync(sslCrt)) {
	// 	console.error('SSL files are not found. check your config.js file')
	// 	process.exit(0)
	// }
	// const tls = {
	// 	cert: fs.readFileSync(sslCrt),
	// 	key: fs.readFileSync(sslKey)
	// }

	const app = await createFastifyApp()
	const { httpIp, httpPort } = config

	app.listen(httpPort, httpIp, () => {
		const listenIps = config.mediasoup.webRtcTransport.listenIps[0]
		const ip = listenIps.announcedIp || listenIps.ip
		console.log('server is running')
		console.log(`open https://${ip}:${httpPort} in your web browser`)
	})

	return app
}

// app.register(mercurius, {
// 	schema,
// 	resolvers
// })
