public without sharing class AccountCasesPdfCtrl {
    
    List<Case> accountCasesPrevWeek;

    public List<Case> getAccountCasesPrevWeek() {
        return [
            SELECT Account.Name, Account.Owner.Name, CaseNumber, Status, Priority, Origin, CreatedDate
            FROM Case
            WHERE CreatedDate = LAST_WEEK
            ORDER BY Account.Name ASC
        ];
    }
}