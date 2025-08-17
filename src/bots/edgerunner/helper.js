const baseConfig = {
	provider: {
		name: "pinnacle",
		storeData: true,
		interval: 10,
		userId: "",
		alertApiUrl: "",
	},
	bookmaker: {
		name: "betking",
		storeData: true,
		interval: 10,
		username: "",
		password: ""
	},
	edgerunner: {
		name: "edgerunner",
		stakeFraction: 0.1,
		fixedStake: { enabled: true, value: 10 },
		minValueBetPercentage: 0
	}
};


function createEdgeRunnerConfig(partial = {}) {
	return {
		...baseConfig,
		provider: {
			...baseConfig.provider,
			...partial.provider,
			...(partial.provider?.userId && { 
				userId: partial.provider.userId,
				alertApiUrl: `https://swordfish-production.up.railway.app/alerts/${partial.provider.userId}`
			})
		},
		bookmaker: {
			...baseConfig.bookmaker,
			...partial.bookmaker,
			...(partial.bookmaker?.username && { username: partial.bookmaker.username }),
			...(partial.bookmaker?.password && { password: partial.bookmaker.password })
		},
		edgerunner: {
			...baseConfig.edgerunner,
			...partial.edgerunner,
			fixedStake: {
				...baseConfig.edgerunner.fixedStake,
				...(partial.fixedStakeValue && { value: partial.fixedStakeValue }),
				...(partial.edgerunner?.fixedStake || {})
			}
		}
	};
}

export { baseConfig, createEdgeRunnerConfig };

