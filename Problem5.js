// Problem 5 – Performance Optimization 
// Explain database indexing, caching strategy, and cache invalidation for optimizing partner 
// availability APIs. 


DATABASE INDEXING :

 Database indexing improves query speed by avoiding full table scans.
 Composite and partial indexes should be added on frequently filtered columns such as city, is_active, partner_id, status, and slot_end.

CACHING :

 Caching using Redis reduces database load by storing frequently accessed availability results. Cache keys can be city-based (e.g., availability:Mumbai).

CAche Invalidation :


 Cache invalidation must happen when booking status changes or partner availability changes. This can be done either manually (deleting cache on updates) or using short TTL
