import Fastify from 'fastify'
import FastifyWS from 'fastify-websocket'
import soup from './soup'
// import mercurius from 'mercurius'

const app = Fastify()

app.register(FastifyWS)

// const schema = `
//   type Query {
//     add(x: Int, y: Int): Int
//   }
// `

// const resolvers = {
// 	Query: {
// 		add: async () => 2
// 	}
// }

// app.register(mercurius, {
// 	schema,
// 	resolvers
// })

app.get('/', async function () {
	return 'hello'
})

app.listen(5000, () => {
	soup()
	console.log('Serve Ready at port 5000')
})
