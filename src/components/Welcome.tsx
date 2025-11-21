import type React from "react";

interface WelcomeProps {
	name: string;
}

const Welcome: React.FC<WelcomeProps> = ({ name }) => {
	return (
		<div className="welcome-container">
			<h2>Welcome to your React Vite TypeScript App, {name}!</h2>
			<p>This is a sample component to demonstrate the setup.</p>
		</div>
	);
};

export default Welcome;
