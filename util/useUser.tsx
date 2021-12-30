import { Flex, Spinner } from "@chakra-ui/react";
import axios from "axios";
import { deleteApp, FirebaseApp, FirebaseOptions, initializeApp } from "firebase/app";
import {
	createUserWithEmailAndPassword,
	getAuth,
	onAuthStateChanged,
	signInWithEmailAndPassword,
	signOut,
	User,
	UserCredential
} from "firebase/auth";
import { createContext, useContext, useEffect, useState } from "react";
import { auth } from "./firebase";

type ContextValue = {
	currentUser?: User;
	config?: FirebaseOptions;
	app?: FirebaseApp;
	setConfig?: React.Dispatch<React.SetStateAction<FirebaseOptions>>;
	login?: (email: string, password: string) => Promise<any>;
	signup?: (email: string, password: string) => Promise<UserCredential>;
	logout?: () => Promise<void>;
};

const AuthContext = createContext<ContextValue>({});

export default function useUser() {
	return useContext(AuthContext);
}

export function AuthProvider({ children }) {
	const [currentUser, setCurrentUser] = useState<User>();
	const [config, setConfig] = useState<FirebaseOptions>();
	const [app, setApp] = useState<FirebaseApp>();
	const [loading, setLoading] = useState(true);

	const login = async (email: string, password: string) => {
		return signInWithEmailAndPassword(auth, email, password);
	};

	const signup = async (email: string, password: string) => {
		return createUserWithEmailAndPassword(auth, email, password);
	};

	const logout = async () => {
		setConfig(undefined);
		deleteApp(app);
		setApp(undefined);
		window.localStorage.removeItem(`fb_config_${currentUser.uid}`);
		return await signOut(auth);
	};

	useEffect(() => {
		const unsubscribe = onAuthStateChanged(auth, async (user) => {
			if (user) {
				if (window.localStorage.getItem(`fb_config_${user.uid}`)) {
					setConfig(JSON.parse(window.localStorage.getItem(`fb_config_${user.uid}`)));
				} else {
					const { data } = await axios.get("/api/config", {
						headers: { uid: user.uid, token: await user.getIdToken() }
					});
					if (data) {
						setConfig(data as FirebaseOptions);
						window.localStorage.setItem(`fb_config_${user.uid}`, JSON.stringify(data));
					}
				}

			// 	const customerAuth = getAuth(app);
			// 	await signInWithEmailAndPassword(customerAuth, "", "").catch(async (e) => {
			// 		if (e.message.includes("auth/user-not-found")) {
			// 			await createUserWithEmailAndPassword(customerAuth, "", "");
			// 		}
			// 	});
			}

			setCurrentUser(user);
			setLoading(false);
		});

		return unsubscribe;
	}, []);

	useEffect(() => {
		if (!currentUser || !config) return;
		if (app) {
			(async () => await deleteApp(app).then(() => setApp(undefined)))();
		}
		const initApp = initializeApp(config, currentUser.uid);
		setApp(initApp);

		return () => {
			if (app) {
				deleteApp(app).then(() => setApp(undefined));
			}
		};
	}, [config, currentUser]);

	return (
		<AuthContext.Provider value={{ currentUser, login, logout, signup, config, setConfig, app }}>
			{!loading ? (
				children
			) : (
				<Flex minH="100vh" align="center" justify="center">
					<Spinner thickness="4px" speed="0.65s" emptyColor="gray.200" color="blue.500" size="xl" />
				</Flex>
			)}
		</AuthContext.Provider>
	);
}
