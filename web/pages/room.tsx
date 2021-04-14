import React, { useRef } from 'react'

import socketClient, { Socket } from 'socket.io-client'

import * as mediasoupClient from 'mediasoup-client'
import { Device } from 'mediasoup-client/lib/Device'
import { Producer } from 'mediasoup-client/lib/Producer'
import { Transport } from 'mediasoup-client/lib/Transport'

import createSocketRequest from '../app/util/createSocketRequest'

const Room: React.FC = () => {
	let device: Device
	let socket: Socket
	let producer: Producer
	let stream: MediaStream
	let socketRequest

	const videoRef = useRef<HTMLVideoElement>(null)
	const remoteVideoRef = useRef<HTMLVideoElement>(null)

	const connect = () => {
		const opts = {
			path: '/server',
			transports: ['websocket']
		}

		const url = `http://localhost:5000`

		socket = socketClient(url, opts)
		socketRequest = createSocketRequest(socket)

		socket.on('connect', async () => {
			console.log('Connected: ', socket.connected)

			const data = await socketRequest('getRouterRtpCapabilities')
			await loadDevice(data)
			console.log('conProduce', device.canProduce('video'))
		})
	}

	const loadDevice = async (routerRtpCapabilities) => {
		try {
			device = new mediasoupClient.Device()
		} catch (error) {
			if (error.name === 'UnsupportedError') {
				console.error('browser not supported')
			}
		}
		await device.load({ routerRtpCapabilities })
	}

	const publish = async (type: 'webcam' | 'sharescreen') => {
		const isWebcam = type === 'webcam'

		const data = await socketRequest('createProducerTransport', {
			forceTcp: false,
			rtpCapabilities: device.rtpCapabilities
		})

		if (data && data.error) {
			console.error(data.error)
			return
		}

		const transport = device.createSendTransport(data)
		transport.on('connect', async ({ dtlsParameters }, callback, errback) => {
			socketRequest('connectProducerTransport', { dtlsParameters })
				.then(callback)
				.catch(errback)
		})

		transport.on(
			'produce',
			async ({ kind, rtpParameters }, callback, errback) => {
				try {
					const { id } = await socketRequest('produce', {
						transportId: transport.id,
						kind,
						rtpParameters
					})
					console.log('id', id)
					callback({ id })
				} catch (err) {
					errback(err)
				}
			}
		)

		transport.on('connectionstatechange', (state) => {
			switch (state) {
				case 'connecting':
					break

				case 'connected':
					videoRef.current.srcObject = stream
					break

				case 'failed':
					transport.close()
					break

				default:
					break
			}
		})

		try {
			stream = await getUserMedia(transport, isWebcam)
			const track = stream.getVideoTracks()[0]
			const params = { track }
			producer = await transport.produce(params)
			await producer.emit('connectionstatechange', 'connected')
		} catch (err) {
			console.error(err)
		}
	}

	const getUserMedia = async (transport: Transport, isWebcam: boolean) => {
		if (!device.canProduce('video')) {
			console.error('cannot produce video')
			return
		}

		let stream: MediaStream
		try {
			stream = isWebcam
				? await navigator.mediaDevices.getUserMedia({ video: true })
				: //@ts-ignore
				  await navigator.mediaDevices.getDisplayMedia({ video: true })
		} catch (err) {
			console.error('getUserMedia() failed:', err.message)
			throw err
		}
		return stream
	}

	async function subscribe() {
		console.log('subscribing')
		const data = await socketRequest('createConsumerTransport', {
			forceTcp: false
		})

		if (data.error) {
			console.error(data.error)
			return
		}

		const transport = device.createRecvTransport(data)
		transport.on('connect', ({ dtlsParameters }, callback, errback) => {
			socketRequest('connectConsumerTransport', {
				transportId: transport.id,
				dtlsParameters
			})
				.then(callback())
				.catch(errback())
		})

		transport.on('connectionstatechange', async (state) => {
			switch (state) {
				case 'connecting':
					break

				case 'connected':
					remoteVideoRef.current.srcObject = stream
					// await socketRequest('resume')
					break

				case 'failed':
					transport.close()
					break

				default:
					break
			}
		})

		stream = await consume(transport)
	}

	async function consume(transport: Transport) {
		const { rtpCapabilities } = device
		const data = await socketRequest('consume', { rtpCapabilities })
		const { producerId, id, kind, rtpParameters } = data

		const consumer = await transport.consume({
			id,
			producerId,
			kind,
			rtpParameters
		})
		const stream = new MediaStream()
		stream.addTrack(consumer.track)
		return stream
	}

	return (
		<div>
			<div>
				<div>
					<div>
						<div>Local</div>
						<video ref={videoRef} controls autoPlay playsInline></video>
					</div>
					<div>
						<div>Remote</div>
						<video ref={remoteVideoRef} controls autoPlay playsInline></video>
					</div>
				</div>
			</div>
			<div>
				<div>
					<div>
						<div id="fs_connection">
							<legend>Connection</legend>
							<div>
								<button id="btn_connect" onClick={() => connect()}>
									Connect
								</button>{' '}
								<span id="connection_status"></span>
							</div>
						</div>
					</div>
					<div>
						<div>
							<legend>Publishing</legend>
							<div>
								<input type="checkbox" id="chk_simulcast" />
							</div>
							<div>
								<button onClick={() => publish('webcam')}>Start Webcam</button>
								<span id="webcam_status"></span>
							</div>
							<div>
								<button onClick={() => publish('sharescreen')}>
									Share Screen
								</button>
								<span id="screen_status"></span>
							</div>
						</div>
					</div>
					<div>
						<div id="fs_subscribe">
							<legend>Subscription</legend>
							<div>
								<button onClick={() => subscribe()}>Subscribe</button>{' '}
								<span id="sub_status"></span>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	)
}

export default Room
