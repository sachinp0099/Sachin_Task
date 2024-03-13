let express = require("express");
let joi = require("joi");
let app = express();
let {Sequelize, Model, DataTypes,QueryTypes, Op} = require("sequelize");
let sequelizeCon = new Sequelize("mysql://root@localhost/boppo_task");

app.use(express.json());
app.use(express.urlencoded({extended:true}));

sequelizeCon.authenticate().then(()=>{
    console.log("DataBase Is Connected");
}).catch((error)=>{
    console.log("DataBase Is Not Connected");
})

// Department Schema

class Department extends Model{ }
 Department.init({
    id:{
        type: DataTypes.INTEGER,
        allowNull: false,
        primaryKey: true,
        autoIncrement: true
    },
    departmentId:{
        type: DataTypes.STRING,
        allowNull: false,
        unique: true
    },
    name:{
        type: DataTypes.STRING,
        allowNull: false
    },
    createOn:{
        type: DataTypes.DATEONLY,
        allowNull: false
    },
 },
   {tableName:"department", modelName:"Department", sequelize:sequelizeCon})


//  Employees Schema

class Employees extends Model{ }
 Employees.init({
    id:{
        type: DataTypes.INTEGER,
        allowNull: false,
        primaryKey: true,
        autoIncrement: true
    },
    employeeId:{
        type: DataTypes.STRING,
        allowNull: false,
        unique: true
    },
    Fname:{
        type: DataTypes.STRING,
        allowNull: false
    },
    Iname:{
        type: DataTypes.STRING,
        allowNull: false
    },
    onBoardDate:{
        type: DataTypes.DATEONLY,
        allowNull: false
    },
    age:{
        type: DataTypes.INTEGER,
        allowNull: false
    },
 },
   {tableName:"employees", modelName:"Employees", sequelize:sequelizeCon})


//  Projects Schema

class Projects extends Model{ }
 Projects.init({
    id:{
        type: DataTypes.INTEGER,
        allowNull: false,
        primaryKey: true,
        autoIncrement: true
    },
    projectId:{
        type: DataTypes.STRING,
        allowNull: false,
        unique: true
     },
    name:{
        type: DataTypes.STRING,
        allowNull: false
    },
    createOn:{
        type: DataTypes.DATE,
        allowNull: false
    },
 },
   {tableName:"projects", modelName:"Projects", sequelize:sequelizeCon})

// projects_employees schema

class Project_emp extends Model{ }
Project_emp.init({
    projectId:{
        type: DataTypes.INTEGER,
        allowNull: false,
        unique: true
    },
    employeeId:{
        type: DataTypes.INTEGER,
        allowNull: false,
        unique: true
    },
    joined:{
        type: DataTypes.DATE,
        allowNull: false
    },
    createOn:{
        type: DataTypes.DATE,
        allowNull: false
    },
 },
   {tableName:"project_emp", modelName:"Project_emp", sequelize:sequelizeCon})


//    sequelizeCon.sync({alter:true})

   // add employee with department

   
   async function validEmployees(data) {
   
        let schema = joi.object({
            Fname: joi.string().required(),
            Iname: joi.string().required(),
            departmentId: joi.string().required(),
            onBoardDate: joi.date().required(),
            age: joi.number().required()
        })
        let valid = await schema.validateAsync(data, { abortEarly: false })
        if (!valid || (valid && valid.error)) {
            let msg = []
            for (let detail of valid.error.details) {
                msg.push(detail.message)
            }
            return { error: msg }
        }
        return { data: valid }
    }


    app.post('/create', async (req, res) => {
        let valid = await validEmployees(req.body);
      
        if (!valid || (valid && valid.error)) {
          return res.send({ error: valid.error });
        }
      
        let findEmp = await Employees.findOne({ where: { Fname: req.body.Fname, Iname: req.body.Iname } });
      
        if (findEmp) {
          return res.send({ error: "Employee already added" });
        }
      
        let count = 1;
        let str = "EMP00";
        let uniqueID = await createID(str, count);
      
        let empData = {
          Fname: req.body.Fname,
          Iname: req.body.Iname,
          departmentId: req.body.departmentId,
          onBoardDate: new Date(req.body.onBoardDate),
          age: parseInt(req.body.age),
          employeeId: uniqueID
        };
      
        let data = await Employees.create(empData);
      
        if (!data) {
          return res.send({ error: "Can't add employee" });
        }
      
        return res.send({ data });
      });
      
      async function createID(str, count) {
        let empID = `${str}${count}`;
        let existID = await Employees.findOne({ where: { employeeId: empID } }).catch((error) => {
          return { error };
        });
        if (existID) {
          return createID(str, count + 1);
        }
        return empID;
      }

    
        
    // data retrieve from employee
      
    app.get('/employees', async (req, res) => {
       
          let { employeeId, searchquery } = req.query;
      
          let whereCondition = {};
          if (employeeId) {
            whereCondition = { employeeId };
          }
      
          if (searchquery) {
            whereCondition[Op.or] = [
              { employeeId: { [Op.like]: `%${searchquery}%` } },
              { '$employeeDepartment.name$': { [Op.like]: `%${searchquery}%` } },
              { '$Projects.name$': { [Op.like]: `%${searchquery}%` } },
              { employeeName: { [Op.like]: `%${searchquery}%` } },
            ];
          }
      
          const employees = await Employees.findAll({
            where: whereCondition,
            include: [
              {
                model: Department,
                attributes: ['departmentId', 'name'],
                as: 'employeeDepartment',
              },
              {
                model: Projects,
                attributes: ['projectsId', 'name'],
                through: { attributes: [] },
              },
            ],
          });
      
          const data = employees.map(employee => ({
            employeeId: employee.employeeId,
            employeeName: `${employee.Fname} ${employee.Iname}`,
            departmentId: employee.employeeDepartment.departmentId,
            departmentName: employee.employeeDepartment.name,
            currentlyWorkingProject: {
              projectId: employee.Projects.length > 0 ? employee.Projects[0].projectsId : null,
              projectName: employee.Projects.length > 0 ? employee.Projects[0].name : null,
            },
          }));
      
          return res.send(data);
        
      });


    // get age of all departments

    app.get('/avg-age',async(req,res)=>{
             let dept = await Department.findOne({ departmentId: id }).catch((error) => {
            return { error }
        })
        if (!dept || (dept && dept.error)) {
            return { error: 'Invalid department ID' }
        }
        let data = await Department.aggregate([
            { $match: { departmentId: id } },
            {
                $lookup: {
                    from: "employees",
                    localField: "departmentID",
                    foreignField: "departmentId",
                    as: "empInfo"
                }
            },
            { $unwind: "$empInfo" },
            {
                $group: {
                    _id: "$deptID",
                    averageAge: { $avg: "$empInfo.age" },
                    deptName: { $first: dept.name }
    
                }
            },
            {
                $project: {
                    departmentId: 1,
                    name: 1,
                    averageAge: 1
                }
            }])
        return { data }
    })
      
      


    
    app.delete('/employee/delete/:id', async(req,res)=>{
        let find = await Employees.findOne({where: {employeeId: req.params.employeeId}}).catch((err)=>{
            return {error:err}
        })
        let data = await Employees.destroy({where:{employeeId:find.employeeId}}).catch((err)=>{
            return {error:err}
        })
        // if(!data || (data && data.error)){
        //     return res.send ({error:"can not delete employee"})
        // }
        return res.send ({data: "employee deleted"})
    }) 


app.listen(3405, ()=>{
  console.log("Server Is Connected");
    })