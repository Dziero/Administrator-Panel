
## Installation

Install packages with npm

```
  cd User-Managment-System
  npm install 
```
    
## Getting Started

To get started with this project, follow these steps:
1. Clone this repository to your local machine.
2. Navigate to the project directory.
3. Install dependencies using the following command: ```npm install``` 
4. Create a MySQL database and tables using the `db.sql` file.
6. Update values in .env file 
6. Start the application using the following command: ```npm start```
7. Access the application at `http://localhost:3000`.

Here's an example of what the connection object in your index.js file would look like with your MySQL database credentials in .env:
```
HOST= IP 
USER= USER
PASSWORD= PASSWORD TO DATABASE
DATABASE= NAME OF DATABASE
```

Please replace the user, password, and database values with your own MySQL database credentials.
Remember to remove .env.example to .env




## Screenshots

![App Screenshot](https://i.imgur.com/WzHrQPO.png)

![App Screenshot](https://i.imgur.com/MncnKgD.png)

![App Screenshot](https://i.imgur.com/N8TdKCs.png)


## Documentation

[MySQL](https://github.com/mysqljs/mysql#readme) \
[Express](https://expressjs.com/)\
[Body-parser](https://github.com/expressjs/body-parser#readme)\
[Cookie-session](https://github.com/expressjs/cookie-session#readme)\
[crypto-js](https://github.com/brix/crypto-js#readme)\
[Path](https://nodejs.org/docs/latest-v16.x/api/path.html)\
[Multer](https://github.com/expressjs/multer#readme)\
[uuidv4](https://www.npmjs.com/package/uuidv4)\
[dotenv](https://www.npmjs.com/package/dotenv)
