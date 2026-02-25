// Problem 2 – Partner Assignment Logic
// Assign a partner based on availability, lowest active workload, and same city. Write a 
// function to return the best partner_id and explain tie-breaking logic. 

    
async function getBestPartner(city){
    const query = `SELECT 
            p.id,
            COUNT(b.id) AS active_workload
        FROM partners p
        LEFT JOIN bookings b 
            ON p.id = b.partner_id
            AND b.status = 'CONFIRMED'
            AND b.slot_end > NOW()
        WHERE p.city = $1
          AND p.is_active = TRUE
        GROUP BY p.id
        ORDER BY active_workload ASC, p.created_at ASC
        LIMIT 1;`
 const result = await db.query(query, [city])
    if(result.rows.length === 0){
        return null
    }
return result.rows[0].id
}


app.get("/assign-partner/:city", async (req, res) =>{
    const city = req.params.city

    try{
        const partnerId = await getBestPartner(city)
  if(!partnerId){
            return res.status(404).json({
                message : "No available partner found"
            })}

        res.json({
        assigned_partner_id : partnerId
        })
    }
    catch(error){
        res.status(500).json({
            message : "Error assigning partner"
        })}

})
