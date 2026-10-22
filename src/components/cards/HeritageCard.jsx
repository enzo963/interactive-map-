import "../../styles/heritage-card.css"


function HeritageCard({ site }) {
    return (
    <article className="heritage-card">
        <div className="heritage-card__image">
        {site.main_image ? (
        <img src={site.main_image} alt={site.name} />
        ) : (
        <div className="heritage-card__placeholder">
            No image available
        </div>
        )}
        </div>

        <div className="heritage-card__content">
        <p className="heritage-card__location">
        {site.city} • {site.governorate}
        </p>

        <h2>{site.name}</h2>

        <p>{site.short_description}</p>

        {site.has_3d && (
        <span className="heritage-card__badge">
            3D Available
        </span>
        )}

        <button type="button">
        More Details
        </button>
    </div>
    </article>
    )
}

export default HeritageCard