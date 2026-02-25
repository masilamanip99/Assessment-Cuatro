
async function createPaymentTable(){
    const connection = await db.connect()
try{
    await connection.query("BEGIN")
        await connection.query(`
            CREATE TABLE IF NOT EXISTS payments
            (
                id SERIAL PRIMARY KEY,
            booking_id INT NOT NULL,
             payment_gateway_id VARCHAR(255) NOT NULL,
         event_id VARCHAR(255) NOT NULL,
             amount NUMERIC(10,2) NOT NULL,
             currency VARCHAR(10) NOT NULL,
            status VARCHAR(50) NOT NULL,
            created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW(),
             FOREIGN KEY (booking_id)
                    REFERENCES bookings(id)
                    ON DELETE CASCADE
            )`)

        await connection.query(`
            CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_event
            ON payments(event_id)`)

        await connection.query(`
            ALTER TABLE bookings
            ADD COLUMN IF NOT EXISTS payment_status VARCHAR(50) DEFAULT 'PENDING'`)

        await connection.query("COMMIT")
        console.log("Payments table ready")
}
    catch(error){
        await connection.query("ROLLBACK")
        console.log("Payment table error:", error.message)
    }
    finally{
        connection.release()
    }
}



app.post("/webhook/payment", async (req, res) =>{
    const {
     eventId,
    bookingId,
     paymentGatewayId,
     amount,
     currency,
        status
    } = req.body

    const connection = await db.connect()
    try{
        await connection.query("BEGIN")
    const existing = await connection.query(
            "SELECT id FROM payments WHERE event_id = $1",
            [ eventId ])

        if(existing.rows.length > 0){
        await connection.query("ROLLBACK")
            return res.status(200).json({
             message : "Duplicate event ignored"
            })
        }

    
     await connection.query(`
        INSERT INTO payments
        (booking_id, payment_gateway_id, event_id, amount, currency, status)
    VALUES ($1, $2, $3, $4, $5, $6)`,
        [ bookingId, paymentGatewayId, eventId, amount, currency, status ]
        )

        await connection.query(`
        UPDATE bookings
        SET payment_status = $1
        WHERE id = $2`,
        [ status, bookingId ]
        )

        await connection.query("COMMIT")
        res.status(200).json({
            message : "Payment processed successfully"
        })
}
    catch(error)
{
    await connection.query("ROLLBACK")
        if(error.code === "23505"){
         return res.status(200).json({
                message : "Duplicate webhook handled safely" })
        }
        res.status(500).json({
            message : "Webhook processing failed"
        })
    }
    finally{
        connection.release()
    }
})