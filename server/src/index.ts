import Fastify from 'fastify'
import mercurius from 'mercurius'

const app = Fastify()

const schema = `
  type Query {
    add(x: Int, y: Int): Int
  }
`

const resolvers = {
	Query: {
		add: async () => 2
	}
}

app.register(mercurius, {
	schema,
	resolvers
})

app.get('/', async function () {
	return 'hello'
})

app.listen(5000)
