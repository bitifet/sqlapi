sqlAPI - index.js
=================
> Simple API to build customised SQL according given input parameters.


<a name="Brief"></a>Brief
-------------------------

This is a simple tool to build simple parametyzed SQL querys without bothering about provided or not provided parameters.

In fact, in almost all cases it only joins strings for you and prepend keyowrds as needed. For instance, if none of specified input parameters given, "where" clausule is not rendered. So syntax is ALWAYS consistent and no undesired "colName = ''" effect is caused by undefined input.

This is not an ORM. It doesn't know about actual DBMS and does not any kind of SQL syntax validation. It's your concern to build SQL compliant with your DBMS SQL syntax.

It is only intended to be a simple tool to dynamically construct actual SQL querys depending on which input parameters are given or not.

It is even not intended to support complex querys or any kind of data type validation. But, anyway, from version 0.0.9, subquerys are allowed too and works pretty fine at least in the tests I did.


<a name="Brief"></a>Methods
---------------------------

### build

Gets query specification (see [examples](#buildExamples)) and object of named parameters (typically some API request data) and returns sql string with positional parameters interpolated and the corresponding arguments array to feed usual database query functions.

The main benefit is that query specification blocks having parameters which doesn't appears in (input) parameters object will not be rendered in the resulting sql query and it's values won't also appear in outputted arguments array.


#### Syntax:

    build (
        querySpec               // Query specification object (see [examples](#buildExamples)).
        , parameters            // (Named) parameters object.
    )


### factory

Factory is simply a handy function that gets a database-querying function and returns a promisory function.

That is: A function that gets a query specification object and automatically feeds it to build() method and uses it's result to call your provided database-querying function. See [examples](#factoryExamples) for more details.


#### Syntax:

    factory (
        QueryFn                 // function(sql, arguments) // Returning result or promise.
        , def_onFinalFullfill   // (Optional) Default final Fullfill parser.
        , def_onFinalReject     // (Optional) Default final Reject parser.
        , def_onStepFullfill    // (Optional) Default per-step Fullfill parser.
        , def_onStepReject      // (Optional) Default per-step Reject parser.
    ) 


<a name="Examples"></a>Examples
-------------------------------


### <a name="buildExamples"></a>build() examples

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
            "invoice.num",                        // Will look for 'num' argument.
            "empl.name",                          // Will look for 'name' argument.
            "client.name clientName",             // Will look for 'clientName' argument.
            [                                     // Array can be used instead.
                "client.surname",
                "=",                              // ...but operators are no more guessed.
                "$clientSurname"                  // ...and identifying parameter names prepended
            ],                                    // by '$' sign is mandatory in this case.
            [
                "client.sex = $sex",              // Anyway, there is no need to separate it...
                function(s){                      // ...but, if function is provided as last
                    return s[0].toLowerCase();    // property, then it will be called to format
                },                                // input when received .
            ],
            [                                     // Multiple parameter formatting:
                "client.fullname ilike",
                "$clientSurname",
                "|| '_ ' || " // Standing for using "," or not",
                "$clientName",
                function(value, colName) {        // Formatting functions also recieve column name.
                    switch (colName) {            //    ...so you can implement generic ones with special
                        case "clientSurname":     //    behaviour for specific column name.
                            return value.replace(/\s.*/, " "); // Get only firt.
                        default:
                            return value;
                    };
                },
            ],
        ],
        orderBy: [
            "name",
            "client",
            "total desc",
        ],
        _bypass: function(prm){ // Optional bypass callback.
            return false; // (Does nothing)
            // All possible return values are:
            //  * Falsy (false, null, undefined...):
            //      - Does nothing (normal operation).
            //  * String: 
            //      - Replaces sql specification and sets arguments to [].
            //  * Object:
            //      - Replaces arguments with that object.
            //  * Array: 
            //      - Replaces both sql specification and arguments with its first two elements.
            //      - Respect orginal arguments if ommitted (arr[1] == undefined).
            // * (boolean) true:
            //      - Replaces sql and arguments with a nonsense query and arguments:
            //          ("select 0 where false" and [])
            //      - This is useful when you want to fully avoid expensive
            //        query execution depending on given conditions over provided
            //        arguments.
        },
        _strictFunctionComparsion: false, // (Default. You usually doesn't need to specify it)
            // When a parameter name apperars more than one time in the query specification
            // sqlAPI tries to don't waste argument placeholders ($1, $2,...) for each
            // repetition because, if multiple placeholders are used for the same value,
            // database planner could'nt recognize them as "always the same value" and
            // many performance optimizations could not to be applyed.
            // But if some of those parameter names provides a formatting function, those
            // functions needs to be compared to ensure the actual value (and expected database
            // type) matches.
            // In that case, formatting functions should match. But if you are'nt too polite to
            // not define it twice, you could end up with two different functions doing exactly
            // the same and two or more positional parameters will be pointless generated..
            // For this reason sqlAPI, by default, only compares a trimmed string representation
            // of the function. Most of times making your life easier.
            // But, in Javascript, two functions with the exact same implementation, can have
            // different behaviours if they are defined in different scopes.
            // In such situation, you will need to set this parameter to true to ensure only
            // references to the same exact function are matched.
    };

    var args = { // Try commenting-out any combination of this and see the magic:
        // num: 23,
        // name: "John",
        // clientName: "Joseph",
        // clientSurname: "Thomson",
        // sex: "Male",
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
            "person.age >= 18",    // Constant is guessed because of multiple spacing (so don't use "age>=18" or so...
            "name=like",           // Like, ilike or any other textual operators are allowed by prepending '='.
            "surname",
            "petname=ilike pet",   // Will use "pet" parameter for case insensitive "like" matching with petname.
            "pet.age petAge",
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


And even more simplicity for trivial querys...
(But here arguments, if specified, are mandatory. No smart guessing is done).

```javascript
    var query = require("sqlapi");

    var q1 = query.build("select * from foo");
    var q2 = query.build("select * from foo where bar = $1", ["barValue"]);
    var q3 = query.build("select * from foo where bar = $1 and baz = $2", ["barValue", "bazValue"]);

    console.log(q1, q2, q3);
```


Also, from version 0.0.10, the rest of query parts are also parametisable...

```javascript
    var query = require("sqlapi");

    var sql = {
        select: [
            '$foo',
            '$bar as bar',
            'baz',
            'foobar',
        ],
        from: [
            "table1 as t1",
            "table2 as t2  on (t1.x = $baz and t2.y = t1.y)", // Nor here...
        ],
    };

    var args = { // Try commenting-out any combination of this and see the magic:
        foo: "fooValue",
        bar: "barValue",
        baz: "bazValue",
    };

    var q = query.build(sql, args);

    console.log(
        q[0], // Query string.
        q[1]  // Arguments parameter.
    );
```


### <a name="factoryExamples"></a>factory() examples


    var promiseQueryFn = ...  // function(sql, arguments) //-> Returning promise.
        // Existing function or your own implementation.
        // Just needs to accept sql and arguments as parameters and return a promise.

    var promisory = query.factory (
        promiseQueryFn
        // , onFullfill     // Fullfill parser (Optional).
        // , onReject       // Reject parser (Optional).
    );

    var p1 = promisory(sql1, args1);
    var p2 = promisory(sql2, args2);
    // ...

    // p1, p2, etc... are promises which will resolve with the promiseQueryFn
    // resolution optionally parsed though onFullfill parser. Reject messages,
    // when happen, will also be parsed thought onReject parser if defined.





<a name="contributing"></a>Contributing
---------------------------------------

If you are interested in contributing with this project, you can do it in many ways:

  * Creating and/or mantainig documentation.

  * Implementing new features or improving code implementation.

  * Reporting bugs and/or fixing it.
  
  * Sending me any other feedback.

  * Whatever you like...
    
Please, contact-me, open issues or send pull-requests thought [this project GIT repository](https://github.com/bitifet/sqlapi)

