sqlAPI - index.js
=================
> Simple API to build customised SQL according given input parameters.


<a name="Brief"></a>Brief

This is a simple tool to build simple parametyzed SQL querys without bothering about provided or not provided parameters.

In fact, in almost all cases it only joins strings for you and prepend keyowrds as needed. For instance, if none of specified input parameters given, "where" clausule is not rendered. So syntax is ALWAYS consistent and no undesired "colName = ''" effect is caused by undefined input.

Complex querys or any kind of type validation are not supported. Maybe in future versions...


<a name="Examples"></a>Examples

Almost "complete" example:

```javascript
    var query = require("sqlapi");

    var sql = {
        select: [
            "invoice.num", // (Table specified)
            "empl.name",
            "client.name as client", // (Aliased)
            "total", // (No need to specify table)
        ],
        from: [
            "invoice",
            "company.employee as empl using (employee_id)", // (Schema qualified)
            "left outer client on (invoice.client = client.id)",
        ],
        where: [ // Undefined arguments are silently ignored.
            "invoice.num",              // Will look for 'num' argument.
            "empl.name",                // Will look for 'name' argument.
            "client.name clientName",   // Will look for 'clientName' argument.
        ],
        orderBy: [
            "name",
            "client",
            "total desc",
        ],
    };

    var args = { // Try commenting-out any combination of this and see the magic:
        // num: 23,
        // name: "John",
        // clientName: "Joseph",
    };

    var q = query.build(sql, args);

    console.log(
        q[0], // Query string.
        q[1]  // Arguments parameter.
    );
```

But simplicity is also allowed...

```javascript
    var query = require("sqlapi");

    var sql = {
        select: '*', // Array input is not needed if smart join isn't required.
        from: [
            "person left outer join pets using (person_id)", // Nor here...
        ],
        where: [ // Undefined arguments are silently ignored.
            "person.age >= 18", // Constant is guessed because of multiple spacing (so don't use "age>=18" or so...
            "name",
            "surname",
            "petname",
            "pet.age>= petMaxAge", // Notice lack of space between column name and operator.
        ],
        orderBy: [
            "surname, name",
            "pet.age desc, petname",
        ],
    };

    var args = { // Try commenting-out any combination of this and see the magic:
        // name: "Anthony",
        // surname: "Brown",
        // petname: "Ralph",
        // petMaxAge: 6,
    };

    var q = query.build(sql, args);

    console.log(
        q[0], // Query string.
        q[1]  // Arguments parameter.
    );
```




<a name="contributing"></a>Contributing
---------------------------------------

If you are interested in contributing with this project, you can do it in many ways:

  * Creating and/or mantainig documentation.

  * Implementing new features or improving code implementation.

  * Reporting bugs and/or fixing it.
  
  * Sending me any other feedback.

  * Whatever you like...
    
Please, contact-me, open issues or send pull-requests thought [this project GIT repository](https://github.com/bitifet/sqlapi)

