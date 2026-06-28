import scenery from "../../assets/scenery.png";
import cozyCafe from "../../assets/cozy_cafe.png";
import "./background.css";

export default function Background({ activePage }) {
    if (activePage === "feed") {
        return (
            <div 
                className="background moments-background"
                style={{
                    backgroundImage: `url(${cozyCafe})`,
                    backgroundSize: "cover",
                    backgroundPosition: "center center",
                    backgroundRepeat: "no-repeat",
                    left: "220px",
                    width: "calc(100% - 220px)",
                    filter: "brightness(0.55) saturate(0.9)",
                }}
            />
        );
    }

    return (
        <div className="background">
            <img src={scenery} alt="" />
        </div>
    );
}