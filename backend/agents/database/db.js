import postgres from 'postgres'

const connectionString = process.env.DATABASE_URL
const sql = postgres(connectionString, {
    ssl: 'require' // SSL is typically required for Supabase
})

export default sql