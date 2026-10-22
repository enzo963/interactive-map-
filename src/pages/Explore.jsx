import sites from "../data/sites.json"
import HeritageCard from "../components/cards/HeritageCard"

function Explore() {
return (
    <main style={{ padding: "40px" }}>
    <h1>Explore Heritage Sites</h1>

    <section
        style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
        gap: "24px",
        marginTop: "30px",
        }}
    >
        {sites.map((site) => (
        <HeritageCard
            key={site.id}
            site={site}
        />
        ))}
    </section>
    </main>
    )
}

export default Explore