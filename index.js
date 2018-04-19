function validate() {

    let username = document.getElementById("login_user").value
    let password = document.getElementById("login_password").value
    if (username == "Lehrer" && password == "Lehrer123") {
        alert("Anmeldung erfolgreich!")
        window.location = "index.html"; //to another html file.
        return false
    }
    else {
        alert("Falscher Benutzername oder falsches Passwort!")
    }
}

function logout() {
    document.body.innerHTML = ""
    window.location = "login.html"
}

let data_arr = []
function newEntry() {
//Daten von HTML File zu HTML File mit query String
    let input_thema = document.getElementById("input_thema").value
    let input_date = document.getElementById("input_date").value
    let input_art = document.getElementById("input_art").value
    console.log("Eingabedaten erhalten")

    if (input_art !== null && input_date !== null && input_thema !== null) {
        window.location = "allepruefungen.html"
        data_arr.push({
            thema: input_thema,
            date: input_date,
            art: input_art
        })
        console.log(data_arr)
        let get_table = document.getElementById('myTable')
        console.log(get_table)
        alert("Eintrag wurde gespeichert!")

    }
    else {
        alert("!ERROR! Füllen Sie alle Felder aus!")
    }
    
}



