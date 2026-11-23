CSY HTML to APK Converter - V21 update

Main web app: www/index.html
GitHub repository configured in the app: https://github.com/Chaitanya7822/CSY-Android-Builder

Build flow:
1. Use the converter to prepare an Android Project ZIP.
2. Upload/replace the generated project files in the GitHub repository.
3. Open Actions -> CSY Android Build -> Run workflow.
4. Download the APK/AAB from the successful run's Artifacts section.

The app opens the configured GitHub Actions page for convenience. It does not embed a GitHub token or directly query private build status; a secure backend/GitHub App would be required for fully automatic in-app dispatch/status polling. Never paste a personal access token into the HTML app or chat.

Java requirement: 21. Play Store distribution requires a properly signed release AAB and a safely stored upload keystore configured as GitHub Actions repository secrets.
