module.exports = {
    user: 'imqs', //env var: PGUSER
    database: 'main', //env var: PGDATABASE
    password: '1mq5p@55w0rd', //env var: PGPASSWORD
    host: 'localhost', // Server hosting the postgres database
    port: 5432, //env var: PGPORT
    max: 10, // max number of clients in the pool
    idleTimeoutMillis: 30000, // how long a client is allowed to remain idle before being closed
}