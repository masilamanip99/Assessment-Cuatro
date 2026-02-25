const express  = require("express")
const { Pool } = require("pg")
const app = express()
app.use(express.json())

const db = new Pool(
{
    user  : "postgres",
    host    : "localhost",
    database : "slot_booking",
    password : "postgres",
    port   : 5432
})

async function setupDatabase(){
const connection = await db.connect()
    try {
        await connection.query("BEGIN")
     await connection.query(`
        CREATE TABLE IF NOT EXISTS partners
        (
            id SERIAL PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            created_at TIMESTAMP DEFAULT NOW()
        ) ` )

        await connection.query(`
        CREATE TABLE IF NOT EXISTS bookings(
            id SERIAL PRIMARY KEY,
         partner_id INT NOT NULL,
         user_id INT NOT NULL,
         slot_start TIMESTAMP NOT NULL,
         slot_end TIMESTAMP NOT NULL,
        status VARCHAR(20) DEFAULT 'CONFIRMED',
            created_at TIMESTAMP DEFAULT NOW(),
         FOREIGN KEY (partner_id)
                REFERENCES partners(id)
                ON DELETE CASCADE)`
      )

        
    await connection.query(`
        CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_partner_slot
     ON bookings(partner_id, slot_start)
     WHERE status = 'CONFIRMED'
        `
        )

     await connection.query("COMMIT")
        console.log("Tables ready")
    }
    catch(error) {
     await connection.query("ROLLBACK")
        console.log("Error creating tables:", error.message)
    }
    finally {
        connection.release()
    }
}


app.post("/partners", async (req, res) =>{
    const partnerName = req.body.name

    try {
        const response = await db.query(
            "INSERT INTO partners(name) VALUES($1) RETURNING *",
            [ partnerName ]
        )
        res.status(201).json(response.rows[0])
    }
    catch(err){
        res.status(500).json({ message : "Unable to create partner" })
    }
})


app.post("/partners/:partnerId/book", async (req, res) =>{
 const partnerId = req.params.partnerId
    const { userId , slotStart , slotEnd } = req.body

    const connection = await db.connect()

    try{
        await connection.query("BEGIN")

    const bookingResult = await connection.query(
        `
        INSERT INTO bookings
    (partner_id, user_id, slot_start, slot_end, status)
     VALUES ($1, $2, $3, $4, 'CONFIRMED')
    RETURNING *
        `,
        [partnerId , userId , slotStart , slotEnd ])
    await connection.query("COMMIT")

        res.status(201).json( {
            success : true,
            data    : bookingResult.rows[0]
        })
    }
    catch(error){
        await connection.query("ROLLBACK")
        if(error.code === "23505"){
            return res.status(409).json( {
                success : false,
                message : "This time slot is already booked"
            })
        }

        res.status(500).json({
            success : false,
            message : "Booking could not be completed"
        })
    }
    finally{
        connection.release()
    }
})


app.get("/partners/:partnerId/bookings", async (req, res) =>{
    const id = req.params.partnerId

    try{     const result = await db.query(
            "SELECT * FROM bookings WHERE partner_id = $1 ORDER BY slot_start ASC",
            [ id ]
        )
   res.json(result.rows)
    }
    catch(err)
    {
    res.status(500).json({ message : "Error retrieving bookings" })}
})



const PORT = 3000

app.listen(PORT, async () =>
 {
     await setupDatabase()
    console.log("Server started on port " + PORT)
 })