const person = { name: "sean" , age:30};

function checkPerson(person) {

    if (person.age >= 18) {
        console.log(`${person.name} is an adult.`);
    } else {
        console.log(`${person.name} is a minor.`);
    }
    
}

checkPerson(person);


const add = (x, y) => {
    return x + y;
}

console.log("Arrow Function Result: " + add(5, 3));
