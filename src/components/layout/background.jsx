import scenery from "../../assets/scenery.png";
import cozyCafe from "../../assets/cozy_cafe.png";
import "./background.css";

export default function Background({ activePage }) {
    if (activePage === "feed") {
        return (
            <div className="background moments-background" style={{ left: "220px", width: "calc(100% - 220px)" }}>
                <div
                    className="absolute inset-0"
                    style={{
                        backgroundImage: `url(${cozyCafe})`,
                        backgroundSize: "cover",
                        backgroundPosition: "center center",
                        backgroundRepeat: "no-repeat",
                        filter: "brightness(0.7) saturate(0.82)",
                    }}
                />
                <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(245,239,230,0.22),rgba(245,239,230,0.38))]" />
            </div>
        );
    }

    return (
        <div className="background">
            <img src={scenery} alt="" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(252,249,244,0.02),rgba(252,249,244,0.18)_45%,rgba(245,239,230,0.32)_100%)]" />
        </div>
    );
}
