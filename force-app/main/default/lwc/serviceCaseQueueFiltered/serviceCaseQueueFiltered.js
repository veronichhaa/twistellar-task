import { LightningElement, wire } from 'lwc';
import getUserCases from '@salesforce/apex/ServiceCaseQueueService.getUserCases';
import { updateRecord } from 'lightning/uiRecordApi';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import { refreshApex } from '@salesforce/apex';
import { getPicklistValues, getObjectInfo } from 'lightning/uiObjectInfoApi';

const COLUMNS = [
    {
        label: 'Case Number',
        fieldName: 'caseNumberURL',
        type: 'url',
        typeAttributes: {
            label: { fieldName: 'CaseNumber' },
            target: '_blank'
        }
    },
    { label: 'Assignee', fieldName: "ownerName", type: 'text' },
    {
        label: 'Case Status',
        fieldName: 'Status',
        type: 'picklistColumn',
        editable: true,
        typeAttributes: {
            placeholder: 'Choose Status',
            options: { fieldName: 'pickListOptions' },
            value: { fieldName: 'Status' },
            context: { fieldName: 'Id' }
        }
    },
    { label: 'Priority', fieldName: 'Priority', type: 'text' },
    { label: 'Origin', fieldName: 'Origin', type: 'text' }
];

export default class ServiceCaseQueueFiltered extends LightningElement {
    
    columns = COLUMNS;
    data = [];
    cashedData;
    draftValues = [];
    pickListOptions = [];
    lastSavedData = [];
    showSpinner = false;

    @wire(getObjectInfo, { objectApiName: 'Case' })
    objectInfo;
    
    @wire(getPicklistValues, {
        recordTypeId: '$objectInfo.data.defaultRecordTypeId',
        fieldApiName: 'Case.Status'
    })
    wiredPickListOptions({ error, data }) {
        if (data) {
            this.pickListOptions = data.values.map((option) => ({
                label: option.label,
                value: option.value
            }));
        } else if (error) {
            console.error('Error retrieving picklist values:', error);
        }
    }

    @wire(getUserCases)
    wiredUserCases(result) {
        this.cashedData = result;
        if (result.data) {
            this.data = result.data.map(caseRecord => ({
                ...caseRecord,
                pickListOptions: this.pickListOptions,
                caseNumberURL: `/${caseRecord.Id}`,
                ownerName: caseRecord.Owner.Name
            }));
            this.lastSavedData = [...this.data];
        } else if (result.error) {
            this.data = undefined;
            console.error('Error fetching user cases:', result.error);
        }
    }

    handleCellChange(event) {
        event.detail.draftValues.forEach(draftValue => {
            this.updateDraftValues(draftValue);
        });
    }

    updateDraftValues(updateItem) {
        let found = false;
        let updatedDraftValues = this.draftValues.map(draft => {
            if (draft.Id === updateItem.Id) {
                found = true;
                return { ...draft, ...updateItem };
            }
            return draft;
        });

        if (!found) updatedDraftValues.push(updateItem);
        this.draftValues = updatedDraftValues;
    }

    handleSave() {
        this.showSpinner = true;
        const recordInputs = this.draftValues.map(draft => ({ fields: { ...draft } }));

        const promises = recordInputs.map(recordInput =>
            updateRecord(recordInput).catch(error => console.error('Update error:', error))
        );

        Promise.all(promises)
            .then(() => {
                this.showToast('Success', 'Records were updated successfully!', 'success');
                this.draftValues = [];
                return this.refresh();
            })
            .catch(error => {
                console.error('Save error:', error);
                this.showToast('Error', 'Records failed to update.', 'error');
            })
            .finally(() => this.showSpinner = false);
    }

    handleCancel() {
        this.data = JSON.parse(JSON.stringify(this.lastSavedData));
        this.draftValues = [];
    }

    showToast(title, message, variant) {
        this.dispatchEvent(new ShowToastEvent({ title, message, variant, mode: 'dismissable' }));
    }

    async refresh() {
        this.showSpinner = true;
        await refreshApex(this.cashedData);
        this.showSpinner = false;
    }
}
