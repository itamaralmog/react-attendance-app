import React, { useState, useEffect } from 'react';

function App() {
    const [responsibleName, setResponsibleName] = useState('');
    const [currentDate, setCurrentDate] = useState(new Date().toISOString().split('T')[0]);
    const [soldiers, setSoldiers] = useState([]);
    const [lastSoldiers, setLastSoldiers] = useState([]);
    const [errorMessage, setErrorMessage] = useState('');

    useEffect(() => {
        // Fetch previous attendance from the server
        const loadLastAttendance = async () => {
            try {
                const response = await fetch(`http://localhost:5000/api/attendance?responsible=${responsibleName}`);
                if (response.ok) {
                    const data = await response.json();
                    setLastSoldiers(data.soldiers || []);
                } else {
                    console.error('Failed to load last attendance');
                }
            } catch (error) {
                console.error('Error fetching attendance:', error);
            }
        };

        if (responsibleName) {
            loadLastAttendance();
        }
    }, [responsibleName]);

    const handleAddSoldier = (e) => {
        e.preventDefault();
        const soldierName = e.target.elements.soldierName.value;
        if (soldierName) {
            setSoldiers([...soldiers, { name: soldierName, present: false, comment: '' }]);
            e.target.elements.soldierName.value = '';
        }
    };

    const saveAttendance = async () => {
        // בדיקה שחיילים לא נוכחים כוללים הערה
        for (let soldier of soldiers) {
            if (!soldier.present && soldier.comment.trim() === '') {
                alert(`You must provide a comment for ${soldier.name} because they are not present.`);
                return;
            }
        }

        // איחוד הרשימות
        const combinedSoldiers = lastSoldiers.map(soldier => {
            const updatedSoldier = soldiers.find(s => s.name === soldier.name);
            return updatedSoldier ? { ...soldier, ...updatedSoldier } : soldier;
        }).concat(soldiers.filter(s => !lastSoldiers.some(ls => ls.name === s.name)));

        try {
            const response = await fetch('http://localhost:5000/api/attendance/create', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    date: currentDate,
                    responsible: responsibleName,
                    soldiers: combinedSoldiers
                }),
            });

            if (response.ok) {
                alert('Attendance saved successfully');
                setErrorMessage('');
                setSoldiers([]);
            } else {
                const data = await response.json();
                setErrorMessage(data.message || 'Failed to save attendance');
            }
        } catch (error) {
            console.error('Error saving attendance:', error);
            setErrorMessage('Internal server error');
        }
    };

    return (
        <div>
            <h1>Attendance Management</h1>
            {errorMessage && <p style={{ color: 'red' }}>{errorMessage}</p>}
            <form onSubmit={(e) => {
                e.preventDefault(); // Prevents the form from refreshing the page
                setResponsibleName(e.target.elements.responsibleName.value);
            }}>
                <input type="text" name="responsibleName" placeholder="Enter your name" required />
                <button type="submit">Enter</button>
            </form>

            {responsibleName && (
                <div>
                    <h2>Previous Attendance</h2>
                    <ul>
                        {lastSoldiers.map((soldier, index) => (
                            <li key={index}>
                                <input
                                    type="checkbox"
                                    checked={soldier.present}
                                    onChange={(e) => {
                                        const updatedSoldiers = [...lastSoldiers];
                                        updatedSoldiers[index].present = e.target.checked;
                                        setLastSoldiers(updatedSoldiers);
                                    }}
                                />
                                <span>{soldier.name}</span>
                                <input
                                    type="text"
                                    value={soldier.comment}
                                    onChange={(e) => {
                                        const updatedSoldiers = [...lastSoldiers];
                                        updatedSoldiers[index].comment = e.target.value;
                                        setLastSoldiers(updatedSoldiers);
                                    }}
                                />
                            </li>
                        ))}
                    </ul>

                    <h2>Current Attendance</h2>
                    <form onSubmit={handleAddSoldier}>
                        <input type="text" name="soldierName" placeholder="Enter soldier name" />
                        <button type="submit">Add Soldier</button>
                    </form>
                    <ul>
                        {soldiers.map((soldier, index) => (
                            <li key={index}>
                                <input
                                    type="checkbox"
                                    checked={soldier.present}
                                    onChange={(e) => {
                                        const updatedSoldiers = [...soldiers];
                                        updatedSoldiers[index].present = e.target.checked;
                                        setSoldiers(updatedSoldiers);
                                    }}
                                />
                                <span>{soldier.name}</span>
                                <input
                                    type="text"
                                    value={soldier.comment}
                                    onChange={(e) => {
                                        const updatedSoldiers = [...soldiers];
                                        updatedSoldiers[index].comment = e.target.value;
                                        setSoldiers(updatedSoldiers);
                                    }}
                                />
                            </li>
                        ))}
                    </ul>
                    <button onClick={saveAttendance}>Save New Attendance</button>
                </div>
            )}
        </div>
    );
}

export default App;
