import React, { useState } from 'react';
import styles from './OnboardingWizard.module.css';

function OnboardingWizard({ onComplete }) {
	const [step, setStep] = useState(1); // 1: first semester?, 2: semester info, 3: previous GPA, 4: goal CGPA, 5: confirm
	const [isFirstSemester, setIsFirstSemester] = useState(null);
	const [currentSemester, setCurrentSemester] = useState('');
	const [totalSemesters, setTotalSemesters] = useState('');
	const [previousSemesters, setPreviousSemesters] = useState([]);
	const [goalCgpa, setGoalCgpa] = useState('');
	const [errorMsg, setErrorMsg] = useState('');

	const handleFirstSemesterChoice = (choice) => {
		setIsFirstSemester(choice);
		setErrorMsg('');
		if (choice === true) {
			// Jump to goal CGPA for first semester users
			setStep(4);
		} else {
			setStep(2);
		}
	};

	const handleSemesterInfo = () => {
		setErrorMsg('');
		const current = Number(currentSemester);
		const total = Number(totalSemesters);

		if (!Number.isFinite(current) || current < 2) {
			setErrorMsg('Current semester must be at least 2');
			return;
		}
		if (!Number.isFinite(total) || total < current || total > 12) {
			setErrorMsg(`Total semesters must be between ${current} and 12`);
			return;
		}

		// Initialize previous semester array with empty CGPA slots
		const prevCount = current - 1;
		const newPrevious = Array.from({ length: prevCount }, (_, i) => ({
			semester: i + 1,
			cgpa: '',
		}));
		setPreviousSemesters(newPrevious);
		setStep(3);
	};

	const handlePreviousSemesterChange = (index, value) => {
		const updated = [...previousSemesters];
		updated[index].cgpa = value;
		setPreviousSemesters(updated);
	};

	const handlePreviousSemesterComplete = () => {
		setErrorMsg('');

		// Validate all entered
		const allFilled = previousSemesters.every((s) => s.cgpa !== '');
		if (!allFilled) {
			setErrorMsg('Please enter CGPA for all previous semesters');
			return;
		}

		// Validate ranges
		const allValid = previousSemesters.every((s) => {
			const val = Number(s.cgpa);
			return Number.isFinite(val) && val >= 0 && val <= 5;
		});
		if (!allValid) {
			setErrorMsg('All CGPA values must be between 0 and 5');
			return;
		}

		setStep(4);
	};

	const handleGoalCgpaSubmit = () => {
		setErrorMsg('');
		const goal = Number(goalCgpa);

		if (!Number.isFinite(goal) || goal < 0 || goal > 5) {
			setErrorMsg('Goal CGPA must be between 0 and 5');
			return;
		}

		setStep(5);
	};

	const handleConfirm = () => {
		const resolvedTotalSemesters = isFirstSemester ? 8 : Number(totalSemesters);
		const data = {
			isFirstSemester,
			currentSemester: isFirstSemester ? 1 : Number(currentSemester),
			totalSemesters: resolvedTotalSemesters,
			previousSemesters: previousSemesters.map((s) => ({
				...s,
				cgpa: Number(s.cgpa),
			})),
			goalCgpa: Number(goalCgpa),
			onboardingCompleted: true,
		};

		onComplete(data);
	};

	return (
		<div className={styles.overlay}>
			<div className={styles.modal}>
				{/* Step 1: First Semester? */}
				{step === 1 && (
					<div className={styles.step}>
						<h2>Welcome to CGPA Tracker! 🎓</h2>
						<p>Is this your first semester in university?</p>
						<div className={styles.buttonGroup}>
							<button
								type="button"
								onClick={() => handleFirstSemesterChoice(true)}
								className={styles.btnYes}
							>
								Yes, First Semester
							</button>
							<button
								type="button"
								onClick={() => handleFirstSemesterChoice(false)}
								className={styles.btnNo}
							>
								No, I'm further along
							</button>
						</div>
					</div>
				)}

				{/* Step 2: Semester Info */}
				{step === 2 && (
					<div className={styles.step}>
						<h2>Academic Progress</h2>
						<p>Help us understand your position in your degree program.</p>

						<label className={styles.field}>
							<span>What semester are you currently in?</span>
							<input
								type="number"
								min="2"
								max="12"
								placeholder="e.g., 4"
								value={currentSemester}
								onChange={(e) => setCurrentSemester(e.target.value)}
								className={styles.input}
							/>
						</label>

						<label className={styles.field}>
							<span>How many semesters total in your program?</span>
							<input
								type="number"
								min="2"
								max="12"
								placeholder="e.g., 8"
								value={totalSemesters}
								onChange={(e) => setTotalSemesters(e.target.value)}
								className={styles.input}
							/>
							<span className={styles.hint}>
								(Typically 8 for 4-year programs, 6 for 3-year)
							</span>
						</label>

						{errorMsg && <p className={styles.error}>{errorMsg}</p>}

						<button type="button" onClick={handleSemesterInfo} className={styles.btnNext}>
							Next
						</button>
					</div>
				)}

				{/* Step 3: Previous Semester CGPA */}
				{step === 3 && (
					<div className={styles.step}>
						<h2>Previous Semester GPAs</h2>
						<p>Enter your CGPA for each completed semester.</p>

						<div className={styles.semesterList}>
							{previousSemesters.map((sem) => (
								<label key={sem.semester} className={styles.semesterField}>
									<span>Semester {sem.semester} CGPA</span>
									<input
										type="number"
										min="0"
										max="5"
										step="0.01"
										placeholder="e.g., 3.45"
										value={sem.cgpa}
										onChange={(e) => handlePreviousSemesterChange(previousSemesters.indexOf(sem), e.target.value)}
										className={styles.input}
										inputMode="decimal"
									/>
								</label>
							))}
						</div>

						{errorMsg && <p className={styles.error}>{errorMsg}</p>}

						<button type="button" onClick={handlePreviousSemesterComplete} className={styles.btnNext}>
							Next
						</button>
					</div>
				)}

				{/* Step 4: Goal CGPA */}
				{step === 4 && (
					<div className={styles.step}>
						<h2>Your Goal</h2>
						<p className={styles.goalNote}>
							💡 <strong>Important:</strong> This is your target CGPA at the <strong>end of your entire program</strong>,
							not just this semester or session.
						</p>

						<label className={styles.field}>
							<span>Target Final CGPA (at graduation)</span>
							<input
								type="number"
								min="0"
								max="5"
								step="0.01"
								placeholder="e.g., 3.50"
								value={goalCgpa}
								onChange={(e) => setGoalCgpa(e.target.value)}
								className={styles.input}
								inputMode="decimal"
							/>
							<span className={styles.hint}>
								Typical classifications: 4.5+ (First Class), 3.5+ (Upper Second), 2.4+ (Lower Second)
							</span>
						</label>

						{errorMsg && <p className={styles.error}>{errorMsg}</p>}

						<button type="button" onClick={handleGoalCgpaSubmit} className={styles.btnNext}>
							Next
						</button>
					</div>
				)}

				{/* Step 5: Confirmation */}
				{step === 5 && (
					<div className={styles.step}>
						<h2>Review Your Information</h2>

						<div className={styles.summary}>
							<p>
								<strong>Current Semester:</strong> {isFirstSemester ? 1 : currentSemester}
							</p>
							<p>
								<strong>Total Semesters:</strong> {totalSemesters}
							</p>
							{!isFirstSemester && previousSemesters.length > 0 && (
								<p>
									<strong>Previous Semesters:</strong>{' '}
									{previousSemesters.map((s) => `Sem ${s.semester}: ${s.cgpa}`).join(' | ')}
								</p>
							)}
							<p>
								<strong>Goal CGPA:</strong> {goalCgpa}
							</p>
						</div>

						<p className={styles.confirmNote}>
							You can edit these details later in your profile settings.
						</p>

						<div className={styles.buttonGroup}>
							<button
								type="button"
								onClick={() => setStep(isFirstSemester ? 4 : 3)}
								className={styles.btnBack}
							>
								← Back
							</button>
							<button type="button" onClick={handleConfirm} className={styles.btnConfirm}>
								Get Started →
							</button>
						</div>
					</div>
				)}

				{/* Progress indicator */}
				<div className={styles.progress}>
					<span className={step >= 1 ? styles.active : ''}>1</span>
					<span className={step >= 2 && !isFirstSemester ? styles.active : ''}>2</span>
					<span className={step >= 3 && !isFirstSemester ? styles.active : ''}>3</span>
					<span className={step >= 4 ? styles.active : ''}>4</span>
					<span className={step >= 5 ? styles.active : ''}>5</span>
				</div>
			</div>
		</div>
	);
}

export default OnboardingWizard;
