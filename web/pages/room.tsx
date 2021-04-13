import React from 'react'

import * as mediasoupClient from 'mediasoup-client'
import socketClient, { Socket } from 'socket.io-client'

const createSocketRequest = (socket: Socket) => {
	return function request(type, data = {}) {
		return new Promise((resolve) => {
			socket.emit(type, data, resolve)
		})
	}
}

const Room: React.FC = () => {
	let device
	const connect = () => {
		const opts = {
			path: '/server',
			transports: ['websocket']
		}

		const url = `http://localhost:5000`

		const socket = socketClient(url, opts)
		const socketRequest = createSocketRequest(socket)

		socket.on('connect', async () => {
			console.log(socket.connected)

			const data = await socketRequest('getRouterRtpCapabilities')
			await loadDevice(data)
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

	return (
		<div>
			<table>
				<tr>
					<td>
						<div>Local</div>
						<video id="local_video" controls autoPlay playsInline></video>
					</td>
					<td>
						<div>Remote</div>
						<video id="remote_video" controls autoPlay playsInline></video>
					</td>
				</tr>
			</table>
			<table>
				<tr>
					<td>
						<fieldset id="fs_connection">
							<legend>Connection</legend>
							<div>
								<button id="btn_connect" onClick={() => connect()}>
									Connect
								</button>{' '}
								<span id="connection_status"></span>
							</div>
						</fieldset>
					</td>
					<td>
						<fieldset id="fs_publish" disabled>
							<legend>Publishing</legend>
							<div>
								<input type="checkbox" id="chk_simulcast" />
							</div>
							<div>
								<button id="btn_webcam">Start Webcam</button>
								<span id="webcam_status"></span>
							</div>
							<div>
								<button id="btn_screen">Share Screen</button>
								<span id="screen_status"></span>
							</div>
						</fieldset>
					</td>
					<td>
						<fieldset id="fs_subscribe" disabled>
							<legend>Subscription</legend>
							<div>
								<button id="btn_subscribe">Subscribe</button>{' '}
								<span id="sub_status"></span>
							</div>
						</fieldset>
					</td>
				</tr>
			</table>
		</div>
	)
}

export default Room
