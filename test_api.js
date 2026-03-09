async function test() {
    try {
        const res = await fetch("http://localhost:3000/api/evaluate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                dossier: "I am a software engineer with 5 years experience.",
                jobDescription: "We need a software engineer."
            })
        });

        const text = await res.text();
        console.log("STATUS:", res.status);
        console.log("BODY:", text);
    } catch (e) {
        console.error("FETCH ERROR:", e);
    }
}

test();
