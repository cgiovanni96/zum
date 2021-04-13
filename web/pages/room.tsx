import React from 'react'

// import * as mediasoupClient from 'mediasoup-client'
import socketClient from 'socket.io-client'

const Room: React.FC = () => {
	const hostname = window.location.hostname
	const connect = () => {
		const opts = {
			path: '/server',
			transports: ['websocket']
		}

		const url = `http://${hostname}:5000`

		const socket = socketClient(url, opts)

		socket.on('connect', () => {
			console.log('Hello')
		})
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
