public with sharing class ServiceCaseQueueService {

    @AuraEnabled(cacheable = true)
    public static List<Case> getUserCases() {

        List<QueueSobject> caseQueues = [
            SELECT QueueId FROM QueueSobject 
            WHERE SobjectType = 'Case'
            WITH USER_MODE
        ];
    
        Set<Id> queueIds = new Set<Id>();
        for (QueueSobject queue : caseQueues) {
            queueIds.add(queue.QueueId);
        }
    
        List<GroupMember> caseQueueMembers = [
            SELECT UserOrGroupId FROM GroupMember 
            WHERE GroupId IN :queueIds
            WITH USER_MODE
        ];
    
        Set<Id> memberUserIds = new Set<Id>();
        for (GroupMember member : caseQueueMembers) {
            memberUserIds.add(member.UserOrGroupId);
        }
    
        return [
            SELECT Id, CaseNumber, Owner.Name, Status, Priority, Origin 
            FROM Case 
            WHERE Is_Owned_By_Current_User__c = TRUE OR OwnerId IN :memberUserIds
            WITH USER_MODE
            ORDER BY Is_Owned_By_Current_User__c DESC, Numeric_Priority__c ASC, CreatedDate DESC
            LIMIT 25
        ];
    }
    
}