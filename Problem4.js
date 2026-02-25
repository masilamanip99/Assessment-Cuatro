app.post("/bookings/:bookingId/cancel", async (req, res) =>{
const bookingId = req.params.bookingId
const connection = await db.connect()

try{
await connection.query("BEGIN")
const bookingResult = await connection.query(`
    SELECT *
 FROM bookings
 WHERE id = $1
    FOR UPDATE`,
    [ bookingId])

    if(bookingResult.rows.length === 0){
    await connection.query("ROLLBACK")
        return res.status(404).json({
            message : "Booking not found"
        })
    }

const booking = bookingResult.rows[0]
    if(booking.status === "CANCELLED"){
     await connection.query("ROLLBACK")
    return res.status(400).json({
            message : "Booking already cancelled"
        })
    }
    if(booking.assignment_status === "COMPLETED"){
        await connection.query("ROLLBACK")
        return res.status(400).json({
            message : "Completed booking cannot be cancelled"
        })
    }

    const paymentResult = await connection.query(
    `SELECT * FROM payments
     WHERE booking_id = $1
     FOR UPDATE`,
     [ bookingId ])

    if(paymentResult.rows.length === 0){
        await connection.query("ROLLBACK")
        return res.status(400).json({
            message : "Payment details not found"
        })
    }

const payment = paymentResult.rows[0]
let refundAmount = 0
    if(booking.assignment_status === "NOT_ASSIGNED"){
        refundAmount = payment.amount}
    else if(booking.assignment_status === "ASSIGNED"){

        refundAmount = payment.amount * 0.5}
    await connection.query(`
UPDATE bookings
 SET status = 'CANCELLED'
    WHERE id = $1`,
    [ bookingId ])

    await connection.query(`
    UPDATE payments
SET refund_amount = $1,
 refund_status = 'REFUNDED',
 updated_at = NOW()
    WHERE booking_id = $2`,
    [ refundAmount , bookingId ])

await connection.query("COMMIT")

res.json({
    success : true,
    refund_amount : refundAmount
})
}
catch(error){

await connection.query("ROLLBACK")
    res.status(500).json({
        message : "Cancellation failed",
        error : error.message
    })}
finally{
    connection.release()
}
})