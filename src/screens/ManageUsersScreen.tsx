/**
 * src/screens/ManageUsersScreen.tsx
 *
 * --- FIX: Decoupled user detail fetching from add/delete actions.
 * The user list now automatically updates when the premise data changes.
 */
import React, { useState, useEffect, useCallback } from 'react';
import { SafeAreaView, View, Text, StyleSheet, FlatList, TouchableOpacity, Modal, TextInput, ActivityIndicator, Alert } from 'react-native';
import { Users, Plus, X, UserPlus, Mail, User, ShieldCheck, Trash2 } from 'lucide-react-native';

import { COLORS } from '../constants/colors';
import { API_ENDPOINTS } from '../config/api';
import type { SettingsStackScreenProps } from '../navigation/types';
import { useOrientation } from '../hooks/useOrientation';
import { fetchWithAuth } from '../api/fetchwithAuth';
import { usePremise } from '../context/PremiseContext';
import { getCurrentUser } from 'aws-amplify/auth';

type UserDetails = {
    sub: string;
    name: string;
    email: string;
    role: 'Primary User' | 'Secondary User';
};

const ManageUsersScreen: React.FC<SettingsStackScreenProps<'ManageUsers'>> = ({ route, navigation }) => {
    useOrientation('PORTRAIT');
    const { premiseId, masterUserSub } = route.params;
    const { premisesList, refetchPremises } = usePremise();

    const [isModalVisible, setIsModalVisible] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [isFetchingDetails, setIsFetchingDetails] = useState(true);
    const [isPrimaryUser, setIsPrimaryUser] = useState(false);
    const [userDetails, setUserDetails] = useState<UserDetails[]>([]);
    
    const [newName, setNewName] = useState('');
    const [newEmail, setNewEmail] = useState('');

    const fetchUserDetails = useCallback(async () => {
        // Find the most up-to-date version of the premise from the context.
        const currentPremise = premisesList.find(p => p.PremiseId === premiseId);
        if (!currentPremise) {
            console.log("Current premise not found in list, aborting fetch.");
            setIsFetchingDetails(false);
            return;
        }

        setIsFetchingDetails(true);
        
        let allSubs: string[] = [currentPremise.masterUserSub];
        if (Array.isArray(currentPremise.associatedUserSub)) {
            allSubs = [...allSubs, ...currentPremise.associatedUserSub];
        } else if (typeof currentPremise.associatedUserSub === 'string') {
            allSubs.push(currentPremise.associatedUserSub);
        }
        
        const uniqueSubs = [...new Set(allSubs)];

        try {
            const response = await fetchWithAuth(API_ENDPOINTS.getUserDetails, {
                method: 'POST',
                body: JSON.stringify({ userSubs: uniqueSubs }),
            });
            if (!response.ok) throw new Error('Failed to fetch user details');
            
            const details: { sub: string, name: string, email: string }[] = await response.json();
            
            const formattedDetails: UserDetails[] = details.map((d): UserDetails => ({
                ...d,
                role: d.sub === masterUserSub ? 'Primary User' : 'Secondary User',
            })).sort((a, b) => a.role === 'Primary User' ? -1 : 1);
            
            setUserDetails(formattedDetails);
        } catch (error) {
            console.error("Error fetching user details:", error);
            Alert.alert("Error", "Could not load user details.");
        } finally {
            setIsFetchingDetails(false);
        }
    }, [premiseId, masterUserSub, premisesList]);

    // *** CHANGE ***
    // This effect now triggers fetchUserDetails whenever the premisesList from the context changes.
    // This is the key to ensuring the user list is always up-to-date after an add/delete operation.
    useEffect(() => {
        fetchUserDetails();
    }, [premisesList, fetchUserDetails]);

    // This effect is now only responsible for checking the current user's role.
    useEffect(() => {
        const checkUserRole = async () => {
            try {
                const currentUser = await getCurrentUser();
                setIsPrimaryUser(currentUser.userId === masterUserSub);
            } catch (e) { console.error("Could not get current user", e); }
        };
        checkUserRole();
    }, [masterUserSub]);

    const handleAddUser = async () => {
        if (!newName || !newEmail) {
            Alert.alert("Missing Information", "Please enter both a name and an email address.");
            return;
        }
        setIsLoading(true);
        try {
            const payload = { premiseId, name: newName, email: newEmail };
            const response = await fetchWithAuth(API_ENDPOINTS.addSubUser, {
                method: 'POST',
                body: JSON.stringify(payload),
            });

            const responseData = await response.json();

            if (!response.ok || responseData.error) {
                let errorMessage = responseData.error;
                if (typeof responseData.body === 'string') {
                    try {
                        const nestedBody = JSON.parse(responseData.body);
                        errorMessage = nestedBody.error || errorMessage;
                    } catch (e) {}
                }
                throw new Error(errorMessage || 'Failed to add user.');
            }
            
            Alert.alert("Success", `An invitation has been sent to ${newEmail}. The user list will now be updated.`);
            setNewName('');
            setNewEmail('');
            setIsModalVisible(false);
            
            // *** CHANGE ***
            // We only need to refetch the premises. The useEffect will handle updating the user details.
            await refetchPremises(); 
        } catch (error) {
            Alert.alert("Error", error instanceof Error ? error.message : "An unknown error occurred.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleDeleteUser = (userToDelete: UserDetails) => {
        Alert.alert(
            `Delete ${userToDelete.name}?`,
            `Are you sure you want to permanently remove ${userToDelete.email} from this premise? This action cannot be undone.`,
            [
                { text: "Cancel", style: "cancel" },
                { 
                    text: "Delete", 
                    style: "destructive", 
                    onPress: async () => {
                        setIsLoading(true);
                        try {
                            const payload = { premiseId, userSubToDelete: userToDelete.sub };
                            const response = await fetchWithAuth(API_ENDPOINTS.deleteSubUser, {
                                method: 'POST',
                                body: JSON.stringify(payload),
                            });

                            const responseData = await response.json();
                            if (!response.ok || responseData.error) {
                                throw new Error(responseData.error || "Could not delete user.");
                            }

                            Alert.alert("User Deleted", `${userToDelete.name} has been removed.`);
                            
                            // *** CHANGE ***
                            // We only need to refetch the premises. The useEffect will handle updating the user details.
                            await refetchPremises();
                        } catch (error) {
                            Alert.alert("Error", error instanceof Error ? error.message : "Could not delete user.");
                        } finally {
                            setIsLoading(false);
                        }
                    }
                }
            ]
        );
    };

    const premise = premisesList.find(p => p.PremiseId === premiseId);

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.content}>
                <Text style={styles.title}>Manage Users</Text>
                <Text style={styles.subtitle}>{premise?.PremiseName || premiseId}</Text>
                
                {isFetchingDetails && userDetails.length === 0 ? (
                    <ActivityIndicator size="large" color={COLORS.cyan} style={{ flex: 1 }}/>
                ) : (
                    <FlatList
                        data={userDetails}
                        keyExtractor={(item) => item.sub}
                        renderItem={({ item }) => (
                            <View style={styles.userRow}>
                                {item.role === 'Primary User' ? <ShieldCheck color={COLORS.green} /> : <User color={COLORS.cyan} />}
                                <View style={styles.userInfo}>
                                    <Text style={styles.userName}>{item.name || 'No Name Set'}</Text>
                                    <Text style={styles.userEmail}>{item.email}</Text>
                                    <Text style={styles.userRole}>{item.role}</Text>
                                </View>
                                {isPrimaryUser && item.role === 'Secondary User' && (
                                    <TouchableOpacity style={styles.deleteButton} onPress={() => handleDeleteUser(item)} disabled={isLoading}>
                                        <Trash2 color={COLORS.red} size={24} />
                                    </TouchableOpacity>
                                )}
                            </View>
                        )}
                    />
                )}

                {isPrimaryUser && (
                    <TouchableOpacity style={styles.addButton} onPress={() => setIsModalVisible(true)}>
                        <Plus color={COLORS.text} size={20} />
                        <Text style={styles.addButtonText}>Add New User</Text>
                    </TouchableOpacity>
                )}
            </View>

            <Modal
                transparent
                visible={isModalVisible}
                animationType="fade"
                onRequestClose={() => setIsModalVisible(false)}
            >
                <View style={styles.modalBackdrop}>
                    <View style={styles.modalContainer}>
                        <Text style={styles.modalTitle}>Invite New User</Text>
                        <TouchableOpacity onPress={() => setIsModalVisible(false)} style={styles.modalCloseButton}>
                            <X color={COLORS.textSecondary} size={24} />
                        </TouchableOpacity>
                        
                        <View style={styles.inputContainer}>
                            <User color={COLORS.textSecondary} />
                            <TextInput
                                style={styles.textInput}
                                placeholder="Full Name"
                                placeholderTextColor={COLORS.textSecondary}
                                value={newName}
                                onChangeText={setNewName}
                                autoCapitalize="words"
                            />
                        </View>
                        <View style={styles.inputContainer}>
                            <Mail color={COLORS.textSecondary} />
                            <TextInput
                                style={styles.textInput}
                                placeholder="Email Address"
                                placeholderTextColor={COLORS.textSecondary}
                                value={newEmail}
                                onChangeText={setNewEmail}
                                keyboardType="email-address"
                                autoCapitalize="none"
                            />
                        </View>

                        <TouchableOpacity style={styles.modalAddButton} onPress={handleAddUser} disabled={isLoading}>
                            {isLoading ? <ActivityIndicator color={COLORS.text} /> : (
                                <>
                                    <UserPlus color={COLORS.text} size={20} />
                                    <Text style={styles.addButtonText}>Send Invitation</Text>
                                </>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background },
    content: { flex: 1, padding: 16 },
    title: { fontSize: 28, fontWeight: 'bold', color: COLORS.text, textAlign: 'center', marginBottom: 4 },
    subtitle: { fontSize: 16, color: COLORS.textSecondary, textAlign: 'center', marginBottom: 24 },
    addButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.green, padding: 16, borderRadius: 12, marginTop: 20 },
    addButtonText: { color: COLORS.text, fontSize: 16, fontWeight: 'bold', marginLeft: 8 },
    userRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.card, padding: 16, borderRadius: 12, marginBottom: 12 },
    userInfo: { flex: 1, marginLeft: 16 },
    userName: { color: COLORS.text, fontSize: 16, fontWeight: 'bold' },
    userEmail: { color: COLORS.textSecondary, fontSize: 14, },
    userRole: { color: COLORS.cyan, fontSize: 12, fontWeight: 'bold', marginTop: 4 },
    deleteButton: { padding: 8 },
    modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: 20 },
    modalContainer: { width: '100%', backgroundColor: COLORS.background, borderRadius: 16, padding: 24, borderColor: COLORS.cyan, borderWidth: 1 },
    modalTitle: { fontSize: 20, fontWeight: 'bold', color: COLORS.text, marginBottom: 24, textAlign: 'center' },
    modalCloseButton: { position: 'absolute', top: 16, right: 16 },
    inputContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border, borderRadius: 12, paddingHorizontal: 16, marginBottom: 16 },
    textInput: { flex: 1, height: 50, color: COLORS.text, marginLeft: 12, fontSize: 16 },
    modalAddButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.cyan, padding: 16, borderRadius: 12, marginTop: 10 },
});

export default ManageUsersScreen;
