sqlAPI - index.js
=================
> Simple API to build customised SQL according given input parameters.



<a name="Examples"></a>Examples


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
            "zonifname",
            "zonorgname",
            "zonname",
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


<a name="contributing"></a>Contributing
---------------------------------------

If you are interested in contributing with this project, you can do it in many ways:

  * Creating and/or mantainig documentation.

  * Implementing new features or improving code implementation.

  * Reporting bugs and/or fixing it.
  
  * Sending me any other feedback.

  * Whatever you like...
    
Please, contact-me, open issues or send pull-requests thought [this project GIT repository](https://github.com/bitifet/sqlapi)

